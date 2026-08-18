import logging
from datetime import datetime, timedelta
from decimal import Decimal
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.delivery.helper import helper
from api.delivery.porter_views import porter_track_booking
from api.models import Cart, Device, OfferDetail, Order, OrderReview, OrderStatusLog, PorterOrder, RestaurantLocation, RestaurantMenu, User, UserDeliveryAddress, OrderLiveLocation, Payment, Coupon, WalletTransaction
from math import radians, sin, cos, sqrt, atan2
from django.db import transaction
from django.db.models import Q, Exists, OuterRef 
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from api.notifications.notification_payload import track_order_function
from api.notifications.notification_send import send_push_notification
from api.serializers import OrderPlacementSerializer, OrderLiveLocationSerializer
from api.emailer.email_notifications import get_invoice_html, get_order_full_details, send_order_status_email
from decouple import config
from django.utils import timezone
from xhtml2pdf import pisa
from io import BytesIO
import os
from django.conf import settings

from api.utils.utils import get_date_range_from_request, get_date_range_settle, get_final_payment_checks, get_revenue_summary

# Set up logger
logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class TrackOrder(APIView):
    """
    Handles tracking orders for a user.
    """

    def post(self, request, *args, **kwargs):
        logger.info("TrackOrder called with data: %s", request.data)
        try:
            user_id = request.data.get('user_id')
            order_number = request.data.get('order_number')
            user = User.objects.filter(id=user_id).first()
            if not user:
                logger.warning("User not found: user_id=%s", user_id)
                return Response({"status": "error", "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            full_name = user.full_name
            orders = Order.objects.filter(user_id=user_id, order_number=order_number)
            data = []
            for order in orders:
                # Get delivery address
                delivery_address = UserDeliveryAddress.objects.filter(id=order.delivery_address_id).first()

                if delivery_address:
                    address_parts = [
                        delivery_address.street_address,
                        delivery_address.city,
                        delivery_address.state,
                        delivery_address.zip_code,
                        delivery_address.country
                    ]
                    address_string = ", ".join([part for part in address_parts if part])
                else:
                    address_string = ""

                address_details = {
                    "full_name": full_name,
                    "address": address_string,
                    "landmark": delivery_address.near_by_landmark if delivery_address else "",
                    "home_type": delivery_address.home_type if delivery_address else "",
                    "phone_number": user.contact_number if hasattr(user, 'contact_number') else "",  # optional handling
                }

                # Get item details
                cart_items = Cart.objects.filter(order_number=order.order_number)
                item_details = []
                subtotal = Decimal(0)
                for item in cart_items:
                    menu_item = RestaurantMenu.objects.filter(id=item.item_id).first()
                    price = item.item_price if item.item_price is not None else Decimal(0)
                    item_total = price
                    subtotal += item_total
                    item_details.append({
                        "item_name": menu_item.item_name if menu_item else "Unknown",
                        "quantity": item.quantity,
                        "unit_price": str(price),
                        "total_price": str(item_total),
                        "buy_one_get_one_free": item.buy_one_get_one_free
                    })

                if order.coupon_id:
                    try:
                        coupon = OfferDetail.objects.get(id=order.coupon_id)
                        coupon_code = coupon.code
                        coupon_code_text = f"Discount coupon ({coupon_code})"
                    except Coupon.DoesNotExist:
                        coupon_code = None
                        coupon_code_text = f"Discount"
                        discount = Decimal('0.00')
                else:
                    coupon_code = None
                    coupon_code_text = f"Discount"
                    discount = Decimal('0.00')


                review_exists = OrderReview.objects.filter(order_id=order.order_number, user_id=user_id).exists()
                order_status = order.get_status_display()

                if review_exists == False and order_status == "Delivered":
                    review_exists = False
                elif review_exists == True and order_status == "Delivered":
                    review_exists = True
                else:
                    review_exists = True

                restaurant = order.restaurant
                location = restaurant.restaurant_location
                restaurant_address_line = f"{location.shop_no_building or ''} {location.floor_tower or ''} {location.area_sector_locality}, {location.city}, {location.nearby_locality or ''}".strip().replace("  ", " ")
            

                order_payment_details = {
                    "subtotal": str(subtotal),
                    "delivery_fee": str(order.delivery_fee),
                    "total": str(
                        order.total_amount - (order.coupon_discount or 0)
                    ),
                    "payment_status": order.get_payment_status_display(),
                    "order_status": order.get_status_display(),
                }

                coupon_details_details = {
                    "coupon_code": coupon_code,
                    "coupon_discount": (
                        order.coupon_discount
                        if order.coupon_discount
                        else round(discount)
                    ),
                    "coupon_code_text": coupon_code_text,
                }

                restaurant_details = {
                    "restaurant_id": order.restaurant_id,
                    "restaurant_name": order.restaurant.restaurant_name,
                    "restaurant_address_line": restaurant_address_line,
                    "restaurant_image": order.restaurant.profile_image.url,
                    "restaurant_contact": order.restaurant.owner_details.owner_contact,
                }

                payment_method_checks = get_final_payment_checks(order.id, order.get_payment_method_display(),order_payment_details)

                order_data = {
                    "order_number": order.order_number,
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                    "review_present": review_exists,
                    "items": item_details,
                    "delivery_address": address_details,
                    "restaurant_details":restaurant_details,
                    "payment_details":order_payment_details,
                    "coupon_details_details":coupon_details_details,
                    "payment_method_checks": payment_method_checks,
                }

                data.append(order_data)

            logger.info("TrackOrder success for user_id=%s, order_number=%s", user_id, order_number)
            return Response({
                "status": "success",
                "orders": data
            })

        except Exception as e:
            logger.exception("TrackOrder failed: %s", str(e))
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

# ---------- Main view ----------
@method_decorator(csrf_exempt, name='dispatch')
class RestaurantOrders(APIView):
    def post(self, request, *args, **kwargs):
        logger.info("RestaurantOrders called with data: %s", request.data)
        try:
            restaurant_id = request.data.get('restaurant_id')
            if not restaurant_id:
                return Response(
                    {"status": "error", "message": "restaurant_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # ----- Determine date range using helper -----
            range_type = 'current_settlement_week'
            try:
                start_date, end_date = get_date_range_settle('this_week')
            except ValueError as ve:
                return Response(
                    {"status": "error", "message": str(ve)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            print("start_date==",start_date)
            print("end_date==",end_date)

            # Filter orders
            orders_qs = Order.objects.filter(
                restaurant_id=restaurant_id,
                order_date__gte=start_date,
                order_date__lt=end_date + timedelta(days=1)
            ).exclude(status=9)

            # ----- Compute summary (excluding In Progress) -----
            summary = get_revenue_summary(orders_qs)

            # ----- Build detailed order list (all orders) -----
            data = []
            for order in orders_qs:
                user = User.objects.filter(id=order.user_id).first()

                payment_details = Payment.objects.filter(order_id=order.id).first()
                transaction_id = payment_details.razorpay_payment_id if payment_details else None

                delivery_address = UserDeliveryAddress.objects.filter(id=order.delivery_address_id).first()
                if delivery_address:
                    address_parts = [
                        delivery_address.street_address,
                        delivery_address.city,
                        delivery_address.state,
                        delivery_address.zip_code,
                        delivery_address.country
                    ]
                    address_string = ", ".join([part for part in address_parts if part])
                else:
                    address_string = ""

                cart_items = Cart.objects.filter(order_number=order.order_number)
                item_details = []
                subtotal = Decimal(0)
                for item in cart_items:
                    menu_item = RestaurantMenu.objects.filter(id=item.item_id).first()
                    price = item.item_price if item.item_price is not None else Decimal(0)
                    item_total = price
                    subtotal += item_total
                    item_details.append({
                        "item_name": menu_item.item_name if menu_item else "Unknown",
                        "quantity": item.quantity,
                        "unit_price": str(price),
                        "total_price": str(item_total),
                        "buy_one_get_one_free": item.buy_one_get_one_free,
                    })

                order_data = {
                    "full_name": user.full_name,
                    "email": user.email,
                    "phone_number": user.contact_number,
                    "order_number": order.order_number,
                    "delivery_address": address_string,
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                    "items": item_details,
                    "subtotal": str(subtotal),
                    "delivery_fee": str(order.delivery_fee),
                    "total": str(order.total_amount),
                    "status": order.get_status_display(),
                    "transaction_id": transaction_id,
                    "payment_status": order.get_payment_status_display(),
                    "payment_method": order.get_payment_method_display(),
                }

                data.append(order_data)

            logger.info(
                "RestaurantOrders success for restaurant_id=%s, orders_count=%d, total_revenue=%s, range=%s",
                restaurant_id, len(data), summary['total_revenue'], range_type
            )

            # ----- Final response -----
            return Response({
                "status": "success",
                "range": {
                    "type": range_type,
                    "start": start_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "end": end_date.strftime("%Y-%m-%d %H:%M:%S"),
                },
                "orders": data,
                "summary": summary
            })

        except Exception as e:
            logger.exception("RestaurantOrders failed: %s", str(e))
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
def generate_invoice_pdf(order):
    # 1. Get full order details via function
    response = get_order_full_details(order)

    # 2. Extract data from JsonResponse safely
    if isinstance(response, JsonResponse):
        response_data = response.json() if hasattr(response, 'json') else response.content
        if isinstance(response_data, bytes):
            response_data = json.loads(response_data)
    else:
        raise ValueError("Expected JsonResponse from get_order_full_details()")

    if response_data.get("status") != "success":
        raise ValueError("Failed to get full order details")

    order_details = response_data["data"]

    # 3. Get HTML from the separate HTML generator function
    html = get_invoice_html(order_details)

    # 4. Convert HTML to PDF
    result = BytesIO()
    pdf = pisa.CreatePDF(BytesIO(html.encode("utf-8")), dest=result)

    # 5. Save PDF to media/invoices/
    if not pdf.err:
        invoice_dir = os.path.join(settings.MEDIA_ROOT, "order_invoices")
        os.makedirs(invoice_dir, exist_ok=True)
        filename = f"invoice_{order.order_number}.pdf"
        file_path = os.path.join(invoice_dir, filename)
        with open(file_path, "wb") as f:
            f.write(result.getvalue())
        return {
            "filename": filename,
            "full_path": file_path
        }

    return None

class OrderStatusUpdate(APIView):
    def post(self, request, *args, **kwargs):
        logger.info("OrderStatusUpdate called with data: %s", request.data)
        try:
            order_number = request.data.get('order_number')
            new_status = request.data.get('new_status')

            if not order_number or new_status is None:
                logger.warning("OrderStatusUpdate missing required fields: order_number=%s, new_status=%s", order_number, new_status)
                return Response({
                    "status": "error",
                    "message": "order_number and new_status are required."
                }, status=status.HTTP_400_BAD_REQUEST)

            order = Order.objects.get(order_number=order_number)
            logger.info("Updating order %s status from %s to %s", order_number, order.status, new_status)
            
            if new_status == 4:
               helper.create_delivery_request(order_number,order)

            invoice_path = None
            if new_status == 6:
                invoice_path = generate_invoice_pdf(order)   
                order.invoice_path = f"order_invoices/{invoice_path['filename']}"
            order.status = int(new_status)
            order.save()          

            customer_body = None
            payload ={
                "user_id":order.user_id,
                "order_number":order_number
            }
            
            customer_token = (
                Device.objects
                .filter(user_id=order.user_id)
                .order_by('-id')   # latest device
                .values_list('token', flat=True)
                .first()
            )

            response_body = track_order_function(payload,customer_body)            
            if response_body['status'] == "success":
                customer_body = response_body['body']
                title = response_body['title']
                order_number = response_body['order_number']
            
            customer_response = send_push_notification(tokens=[customer_token],title= title ,body= customer_body,order_number= order_number,data= None)

            if new_status in [1, 6, 7, 8, 9]:
                send_order_status_email(order)

            logger.info("OrderStatusUpdate success for order %s, new status %s", order_number, new_status)
            return Response({
                "status": "success",
                "message": f"Order #{order_number} status updated and customer notified.",
                "customer_response":customer_response
            })

        except Order.DoesNotExist:
            logger.warning("OrderStatusUpdate: Order not found: order_number=%s", order_number)
            return Response({
                "status": "error",
                "message": f"Order with number {order_number} not found."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.exception("OrderStatusUpdate failed: %s", str(e))
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_exempt, name='dispatch')
class OrderDetails(APIView):
    """
    Handles tracking orders for a user.
    """

    def post(self, request, *args, **kwargs):
        logger.info("OrderDetails called with data: %s", request.data)
        try:
            user_id = request.data.get('user_id')
            user = User.objects.filter(id=user_id).first()
            if not user:
                logger.warning("OrderDetails: User not found: user_id=%s", user_id)
                return Response({"status": "error", "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            full_name = user.full_name
            orders = Order.objects.filter(user_id=user_id)
            config_data  = config("REACT_APP_BASE_URL")
            data = []
            for order in orders:
                # Get delivery address
                delivery_address = UserDeliveryAddress.objects.filter(id=order.delivery_address_id).first()
                review_exists = OrderReview.objects.filter(order_id=order.order_number)

                if review_exists.exists():
                    rating = review_exists.first().rating  # or iterate
                else:
                    rating= None

                if delivery_address:
                    address_parts = [
                        delivery_address.street_address,
                        delivery_address.city,
                        delivery_address.state,
                        delivery_address.zip_code,
                        delivery_address.country
                    ]
                    address_string = ", ".join([part for part in address_parts if part])
                else:
                    address_string = ""

                
                image_profile = order.restaurant.profile_image

                address_details = {
                    "full_name": full_name,
                    "restaurant_name": order.restaurant.restaurant_name,
                    "restaurant_image": image_profile.url,
                    "address": address_string,
                    "landmark": delivery_address.near_by_landmark if delivery_address else "",
                    "home_type": delivery_address.home_type if delivery_address else "",
                    "phone_number": user.contact_number if hasattr(user, 'contact_number') else "",  # optional handling
                }

                # Get item details
                cart_items = Cart.objects.filter(order_number=order.order_number)
                item_details = []
                subtotal = Decimal(0)
                for item in cart_items:
                    menu_item = RestaurantMenu.objects.filter(id=item.item_id).first()
                    price = item.item_price if item.item_price is not None else Decimal(0)
                    item_total = price
                    subtotal += item_total
                    item_details.append({
                        "item_name": menu_item.item_name if menu_item else "Unknown",
                        "quantity": item.quantity,
                        "restaurant_id": item.restaurant_id,
                        "unit_price": str(price),
                        "total_price": str(item_total),
                        "buy_one_get_one_free": item.buy_one_get_one_free,
                    })

                order_data = {
                    "order_number": order.order_number,
                    "restaurant_id": order.restaurant_id,
                    "status": order.get_status_display(),
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "delivery_address": address_details,
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                    "items": item_details,
                    "subtotal": str(subtotal),
                    "total": str(order.total_amount),
                    "rating":rating
                }

                data.append(order_data)

            logger.info("OrderDetails success for user_id=%s, orders_count=%d", user_id, len(data))
            return Response({
                "status": "success",
                "orders": data
            })

        except Exception as e:
            logger.exception("OrderDetails failed: %s", str(e))
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
@method_decorator(csrf_exempt, name='dispatch')
class LiveLocationDetails(APIView):
    """
    Handles tracking orders for a user.
    """

    def haversine_distance(self, lat1, lon1, lat2, lon2):
        R = 6371  # Radius of Earth in km
        dLat = radians(lat2 - lat1)
        dLon = radians(lon2 - lon1)
        a = sin(dLat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def estimate_time_minutes(self, lat1, lon1, lat2, lon2, speed_kmph=15):
        distance_km = self.haversine_distance(lat1, lon1, lat2, lon2)
        return round((distance_km / speed_kmph) * 60)

    def post(self, request, *args, **kwargs):
        order_id = request.data.get("order_id")
        logger.info("LiveLocationDetails called for order_id=%s", order_id)
        if not order_id:
            logger.warning("LiveLocationDetails: order_id missing")
            return Response(
                {"status": "error", "message": "order_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.select_related("delivery_address", "restaurant").get(order_number=order_id)
        except Order.DoesNotExist:
            logger.warning("LiveLocationDetails: Order not found: order_id=%s", order_id)
            return Response({"status": "error", "message": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        delivery_address = order.delivery_address
        restaurant = order.restaurant

        if not delivery_address or not delivery_address.latitude or not delivery_address.longitude:
            logger.warning("LiveLocationDetails: Delivery address missing location for order_id=%s", order_id)
            return Response({"status": "error", "message": "Delivery address location not found."},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            restaurant_location = restaurant.restaurant_location
        except RestaurantLocation.DoesNotExist:
            logger.warning("LiveLocationDetails: Restaurant location missing for order_id=%s", order_id)
            return Response({"status": "error", "message": "Restaurant location not found."},
                            status=status.HTTP_404_NOT_FOUND)

        # Initialize live location
        live_location_lat = live_location_lng = None
        porter_tracking_details = porter_agent_status = None

        # Use porter live tracking if available
        porter_details = PorterOrder.objects.filter(order_number=order_id).first()

        if porter_details:
            if porter_details.eatoor_delivery_status == 0:
                porter_track_booking(porter_details.booking_id)
            porter_agent_status = porter_details.status
            response = porter_details.track_order_api_response
            
            if response and response.get('partner_info') and response.get('partner_info'):
                loc = response['partner_info']['location']
                if loc:
                    live_location_lat = loc.get('lat')
                    live_location_lng = loc.get('long')
                porter_tracking_details = response

        # Fallback to internal OrderLiveLocation if porter location is not available
        if not live_location_lat or not live_location_lng:
            last_live_location = OrderLiveLocation.objects.filter(order_number=order_id).order_by("-timestamp").first()
            if last_live_location:
                live_location_lat = last_live_location.latitude
                live_location_lng = last_live_location.longitude

        # Calculate ETA if agent location available
        estimated_time = None
        if live_location_lat and live_location_lng:
            estimated_time = self.estimate_time_minutes(
                float(live_location_lat),
                float(live_location_lng),
                float(delivery_address.latitude),
                float(delivery_address.longitude),
            )

        logger.info("LiveLocationDetails success for order_id=%s", order_id)
        return Response({
            "status": "success",
            "user_destination": {
                "lat": delivery_address.latitude,
                "lng": delivery_address.longitude,
            },
            "restaurant_location": {
                "lat": restaurant_location.latitude,
                "lng": restaurant_location.longitude,
            },
            "deliver_agent_location": {
                "lat": live_location_lat,
                "lng": live_location_lng,
            },
            "estimated_time_minutes": estimated_time,
            "porter_agent_assign_status": porter_agent_status,
            "porter_tracking_details": porter_tracking_details
        }, status=status.HTTP_200_OK)
    
@method_decorator(csrf_exempt, name='dispatch')
class UpdateOrderLiveLocationView(APIView):
    """
    API endpoint to receive and store/update live location updates from restaurant during delivery.
    """

    def post(self, request, *args, **kwargs):
        logger.info("UpdateOrderLiveLocationView called with data: %s", request.data)
        try:
            order_number = request.data.get("order_number")
            latitude = request.data.get("latitude")
            longitude = request.data.get("longitude")

            if not order_number or latitude is None or longitude is None:
                logger.warning("UpdateOrderLiveLocationView missing required fields")
                return Response({
                    "status": "error",
                    "message": "order_number, latitude, and longitude are required."
                }, status=status.HTTP_400_BAD_REQUEST)

            # ✅ Check if order_number already exists in OrderLiveLocation
            live_location, created = OrderLiveLocation.objects.update_or_create(
                order_number=order_number,
                defaults={
                    "latitude": latitude,
                    "order_number": order_number,
                    "longitude": longitude,
                    "timestamp": timezone.now()
                }
            )

            message = "Live location created successfully." if created else "Live location updated successfully."
            logger.info("UpdateOrderLiveLocationView %s for order_number=%s", message, order_number)

            return Response({
                "status": "success",
                "message": message
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("UpdateOrderLiveLocationView failed: %s", str(e))
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@method_decorator(csrf_exempt, name='dispatch')
class GetActiveOrders(APIView):
    """
    Returns active orders for a user only if the order exists in Cart.
    """

    def post(self, request, *args, **kwargs):
        logger.info("GetActiveOrders called with data: %s", request.data)

        try:
            user_id = request.data.get("user_id")

            if not user_id:
                return Response(
                    {
                        "status": "error",
                        "message": "user_id is required"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = User.objects.filter(id=user_id).first()

            if not user:
                logger.warning("GetActiveOrders: User not found: user_id=%s", user_id)
                return Response(
                    {
                        "status": "error",
                        "message": "User not found"
                    },
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get only active orders that exist in Cart
            orders = (
                Order.objects.filter(user_id=user_id)
                .exclude(status__in=[6, 7, 8, 9])
                .annotate(
                    in_cart=Exists(
                        Cart.objects.filter(
                            order_number=OuterRef("order_number")
                        )
                    )
                )
                .filter(in_cart=True)
                .select_related("restaurant")
                .order_by("-created_at")
            )

            data = []

            for order in orders:
                data.append({
                    "order_number": order.order_number,
                    "status": order.get_status_display(),
                    "restaurant_name": order.restaurant.restaurant_name,
                    "restaurant_image": (
                        request.build_absolute_uri(order.restaurant.profile_image.url)
                        if order.restaurant.profile_image
                        else None
                    ),
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "estimated_delivery": (
                        order.delivery_date.strftime("%Y-%m-%d %H:%M:%S")
                        if order.delivery_date
                        else "Not available"
                    ),
                })

            logger.info(
                "GetActiveOrders success for user_id=%s, orders_count=%d",
                user_id,
                len(data)
            )

            return Response(
                {
                    "status": "success",
                    "message": "Active orders fetched successfully.",
                    "orders": data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception("GetActiveOrders failed: %s", str(e))
            return Response(
                {
                    "status": "error",
                    "message": "Something went wrong.",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

@method_decorator(csrf_exempt, name='dispatch')
class MarkAsPaid(APIView):
    """
    API endpoint to receive and store/update live location updates from restaurant during delivery.
    """

    def post(self, request, order_number, *args, **kwargs):
        logger.info("MarkAsPaid called for order_number=%s", order_number)
        try:

            Order.objects.filter(order_number=order_number).update(payment_status=5)
            message = "Order Marked As Paid"
            logger.info("MarkAsPaid success for order_number=%s", order_number)
            return Response({
                "status": "success",
                "message": message
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("MarkAsPaid failed for order_number=%s: %s", order_number, str(e))
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class ApplyCouponOrder(APIView):

    def post(self, request, *args, **kwargs):
        logger.info("=" * 80)
        logger.info("ApplyCouponOrder START - Request ID: %s", request.headers.get('X-Request-ID', 'N/A'))
        logger.info("Request data: %s", request.data)
        logger.info("Request user: %s", request.user.id if request.user.is_authenticated else 'Anonymous')
        
        try:
            # Extract parameters
            coupon_code = request.data.get("code")
            order_amount = request.data.get("order_amount")
            restaurant_id = request.data.get("restaurant_id")
            user_id = request.data.get("user_id")
            offer_type = request.data.get("offer_type")
            sub_filter = request.data.get("sub_filter")
            discount_type = request.data.get("discount_type")
            
            logger.info("Extracted parameters - coupon_code: %s, order_amount: %s, restaurant_id: %s, user_id: %s", 
                       coupon_code, order_amount, restaurant_id, user_id)
            logger.info("Optional parameters - offer_type: %s, sub_filter: %s, discount_type: %s", 
                       offer_type, sub_filter, discount_type)

            # ---------------------------------------------------------
            # 1. Validate required parameters
            # ---------------------------------------------------------
            if not coupon_code or not order_amount or not user_id:
                logger.warning("Missing required parameters - coupon_code: %s, order_amount: %s, user_id: %s", 
                              coupon_code, order_amount, user_id)
                return Response(
                    {
                        "status": "error",
                        "message": (
                            "code, order_amount and user_id are required."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ---------------------------------------------------------
            # 2. Convert order amount to Decimal
            # ---------------------------------------------------------
            try:
                order_amount = Decimal(str(order_amount))
                logger.debug("Order amount converted to Decimal: %s", order_amount)
            except (InvalidOperation, TypeError, ValueError) as e:
                logger.error("Invalid order amount conversion error: %s, value: %s", str(e), order_amount)
                return Response(
                    {
                        "status": "error",
                        "message": "Invalid order amount.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if order_amount <= 0:
                logger.warning("Order amount is <= 0: %s", order_amount)
                return Response(
                    {
                        "status": "error",
                        "message": "Order amount must be greater than 0.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ---------------------------------------------------------
            # 3. Build OfferDetail query dynamically
            # ---------------------------------------------------------
            offer_filters = {
                "code": coupon_code,
                "is_active": True,
            }
            logger.debug("Initial offer filters: %s", offer_filters)

            # offer_type is supplied by frontend
            if offer_type:
                offer_filters["offer_type"] = offer_type
                logger.debug("Added offer_type filter: %s", offer_type)

            # sub_filter is optional
            if sub_filter:
                offer_filters["sub_filter"] = sub_filter
                logger.debug("Added sub_filter filter: %s", sub_filter)

            # discount_type is optional
            if discount_type:
                offer_filters["discount_type"] = discount_type
                logger.debug("Added discount_type filter: %s", discount_type)

            logger.info("Querying OfferDetail with filters: %s", offer_filters)
            offer = OfferDetail.objects.filter(**offer_filters).first()

            if not offer:
                logger.warning("No active coupon found with code: %s", coupon_code)
                return Response(
                    {
                        "status": "error",
                        "message": "Invalid coupon code or coupon not active.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            logger.info("Coupon found - ID: %s, Code: %s, Type: %s", 
                       offer.id, offer.code, offer.offer_type)

            # ---------------------------------------------------------
            # 4. Check offer validity
            # ---------------------------------------------------------
            if not offer.is_valid:
                logger.warning("Coupon is invalid/expired - ID: %s, Code: %s, is_valid: %s", 
                              offer.id, offer.code, offer.is_valid)
                return Response(
                    {
                        "status": "error",
                        "message": "Coupon is either inactive or expired.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            logger.info("Coupon validity check passed for ID: %s", offer.id)

            # ---------------------------------------------------------
            # 5. Validate restaurant
            # ---------------------------------------------------------
            if restaurant_id:
                logger.info("Validating restaurant_id: %s for coupon ID: %s", restaurant_id, offer.id)
                
                # Coupon belongs to a specific restaurant
                if offer.restaurant:
                    logger.debug("Coupon is restaurant-specific. Offer restaurant: %s, Request restaurant: %s", 
                                offer.restaurant.restaurant_id, restaurant_id)
                    
                    if str(offer.restaurant.restaurant_id) != str(restaurant_id):
                        logger.warning("Restaurant mismatch - Offer: %s, Request: %s", 
                                      offer.restaurant.restaurant_id, restaurant_id)
                        return Response(
                            {
                                "status": "error",
                                "message": (
                                    "This coupon is not valid for "
                                    "the selected restaurant."
                                ),
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    logger.info("Restaurant validation successful")

                # Coupon is global
                else:
                    if getattr(offer, "filter_type", None) == "specific_restaurant":
                        logger.error("Coupon configured for specific_restaurant but no restaurant assigned - ID: %s", 
                                   offer.id)
                        return Response(
                            {
                                "status": "error",
                                "message": (
                                    "This coupon is configured for "
                                    "specific restaurants but no restaurant "
                                    "is assigned."
                                ),
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    logger.info("Global coupon validation successful")

            else:
                logger.info("No restaurant_id provided. Checking if coupon is restaurant-specific...")
                
                # Restaurant-specific coupon requires restaurant_id
                if offer.restaurant:
                    logger.warning("Restaurant-specific coupon %s requires restaurant_id but none provided", offer.id)
                    return Response(
                        {
                            "status": "error",
                            "message": (
                                "This coupon is restaurant-specific. "
                                "Please provide restaurant_id."
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if getattr(offer, "filter_type", None) == "specific_restaurant":
                    logger.error("Coupon configured for specific_restaurant but no restaurant assigned - ID: %s", 
                               offer.id)
                    return Response(
                        {
                            "status": "error",
                            "message": (
                                "This coupon is configured incorrectly. "
                                "Please contact support."
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                logger.info("No restaurant validation needed for coupon ID: %s", offer.id)

            # ---------------------------------------------------------
            # 6. Check minimum order amount
            # ---------------------------------------------------------
            minimum_order_amount = (
                Decimal(str(offer.minimum_order_amount))
                if offer.minimum_order_amount
                else Decimal("0")
            )
            
            logger.debug("Minimum order amount: %s, Order amount: %s", minimum_order_amount, order_amount)

            if minimum_order_amount > 0 and order_amount < minimum_order_amount:
                logger.warning("Order amount %s below minimum %s for coupon %s", 
                              order_amount, minimum_order_amount, offer.id)
                return Response(
                    {
                        "status": "error",
                        "message": (
                            f"Minimum item amount should be "
                            f"₹{minimum_order_amount} to apply this coupon."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            logger.info("Minimum order amount check passed")

            # ---------------------------------------------------------
            # 7. Calculate discount
            # ---------------------------------------------------------
            discount_amount = Decimal("0")
            offer_discount_type = offer.discount_type
            offer_discount_value = offer.discount_value
            
            logger.info("Calculating discount - Type: %s, Value: %s", 
                       offer_discount_type, offer_discount_value)

            if offer_discount_value:
                discount_value = Decimal(str(offer_discount_value))

                # Percentage discount
                if offer_discount_type == "percentage":
                    discount_amount = order_amount * discount_value / Decimal("100")
                    logger.debug("Percentage discount calculation - order: %s, percentage: %s, discount: %s", 
                                order_amount, discount_value, discount_amount)

                # Fixed discount
                elif offer_discount_type in ["fixed", "fixed_amount"]:
                    discount_amount = discount_value
                    logger.debug("Fixed discount calculation - discount: %s", discount_amount)
            else:
                logger.debug("No discount value provided for coupon %s", offer.id)

            # ---------------------------------------------------------
            # 8. Discount cannot exceed order amount
            # ---------------------------------------------------------
            original_discount = discount_amount
            discount_amount = min(discount_amount, order_amount)
            
            if original_discount != discount_amount:
                logger.info("Discount capped - original: %s, capped: %s, order_amount: %s", 
                           original_discount, discount_amount, order_amount)

            final_total_amount = max(order_amount - discount_amount, Decimal("0"))
            logger.info("Final calculation - order: %s, discount: %s, final: %s", 
                       order_amount, discount_amount, final_total_amount)

            # ---------------------------------------------------------
            # 9. Free delivery
            # ---------------------------------------------------------
            free_delivery = offer.offer_type == "free_delivery"
            if free_delivery:
                logger.info("Free delivery applied for coupon %s", offer.id)

            # ---------------------------------------------------------
            # 10. Response
            # ---------------------------------------------------------
            logger.info("Coupon applied successfully - User: %s, Coupon: %s, Final amount: %s", 
                       user_id, coupon_code, final_total_amount)
            logger.info("=" * 80)

            return Response(
                {
                    "status": "success",
                    "message": "Coupon applied successfully!",

                    "order_amount": round(order_amount, 2),
                    "discount_amount": round(discount_amount, 2),
                    "final_total_amount": round(final_total_amount, 2),

                    "free_delivery": free_delivery,

                    "offer_type": offer.offer_type,
                    "sub_filter": getattr(offer, "sub_filter", None),
                    "discount_type": offer.discount_type,

                    "coupon_details": {
                        "id": offer.id,
                        "code": offer.code,

                        "offer_type": offer.offer_type,
                        "sub_filter": getattr(offer, "sub_filter", None),

                        "discount_type": offer.discount_type,
                        "discount_value": (
                            str(offer.discount_value)
                            if offer.discount_value is not None
                            else None
                        ),

                        "minimum_order_amount": (
                            str(offer.minimum_order_amount)
                            if offer.minimum_order_amount is not None
                            else None
                        ),

                        "restaurant": (
                            str(offer.restaurant.restaurant_id)
                            if offer.restaurant
                            else None
                        ),

                        "filter_type": getattr(offer, "filter_type", None),
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception("=" * 80)
            logger.exception("ApplyCouponOrder FAILED for user: %s, coupon: %s", 
                           request.data.get('user_id'), request.data.get('code'))
            logger.exception("Exception details: %s", str(e))
            logger.exception("Stack trace:")
            logger.exception("=" * 80)

            return Response(
                {
                    "status": "error",
                    "message": (
                        "Something went wrong while "
                        "applying the coupon."
                    ),
                    "error_details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )