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
from api.models import Cart, OfferDetail, Order, OrderReview, OrderStatusLog, PorterOrder, RestaurantLocation, RestaurantMenu, User, UserDeliveryAddress, OrderLiveLocation, Payment, Coupon
from math import radians, sin, cos, sqrt, atan2
from django.db import transaction
from django.db.models import Q 
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from api.serializers import OrderPlacementSerializer, OrderLiveLocationSerializer
from api.emailer.email_notifications import get_invoice_html, get_order_full_details, send_order_status_email
from decouple import config
from django.utils import timezone
from xhtml2pdf import pisa
from io import BytesIO
import os
from django.conf import settings

@method_decorator(csrf_exempt, name='dispatch')
class TrackOrder(APIView):
    """
    Handles tracking orders for a user.
    """

    def post(self, request, *args, **kwargs):
        try:
            user_id = request.data.get('user_id')
            order_number = request.data.get('order_number')
            user = User.objects.filter(id=user_id).first()
            if not user:
                return Response({"status": "error", "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            full_name = user.full_name
            orders = Order.objects.filter(user_id=user_id, order_number=order_number)
            data = []
            for order in orders:
                # Get delivery address
                delivery_address = UserDeliveryAddress.objects.filter(id=order.delivery_address_id).first()
                payment_details = Payment.objects.filter(order_id=order.id).first()

                if payment_details:
                    transaction_id = payment_details.razorpay_payment_id
                else:
                    transaction_id = None

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
                        coupon = Coupon.objects.get(id=order.coupon_id)
                        coupon_code = coupon.code
                        coupon_code_text = f"Discount coupon ({coupon_code})"
                        # You can apply the actual discount logic based on coupon details here
                        # Example (optional): discount = coupon.discount_amount
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
                
                order_data = {
                    "order_number": order.order_number,
                    "restaurant_id": order.restaurant_id,
                    "delivery_fee": order.delivery_fee,
                    "restaurant_name": order.restaurant.restaurant_name,
                    "restaurant_contact": order.restaurant.owner_details.owner_contact,
                    "status": order.get_status_display(),
                    "payment_status": order.get_payment_status_display(),
                    "payment_method": order.get_payment_method_display(),
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "delivery_address": address_details,
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                    "items": item_details,
                    "subtotal": str(subtotal),
                    "total": str(order.total_amount),
                    "coupon_code": coupon_code,
                    "coupon_discount": order.coupon_discount if order.coupon_discount else round(discount),
                    "coupon_code_text": coupon_code_text,
                    "transaction_id": transaction_id,
                    "review_present": review_exists,
                }

                data.append(order_data)

            return Response({
                "status": "success",
                "orders": data
            })

        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

@method_decorator(csrf_exempt, name='dispatch')
class RestaurantOrders(APIView):
    def post(self, request, *args, **kwargs):
        try:

            restaurant_id = request.data.get('restaurant_id')
            orders = Order.objects.filter(restaurant_id=restaurant_id)

            data = []
            for order in orders:
                user = User.objects.filter(id=order.user_id).first()

                payment_details = Payment.objects.filter(order_id=order.id).first()
                if payment_details:
                    transaction_id = payment_details.razorpay_payment_id
                else:
                    transaction_id = None

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
                    "status": order.status,
                    "transaction_id": transaction_id,
                    "payment_status": order.get_payment_status_display(),
                    "payment_method": order.get_payment_method_display(),
                }

                data.append(order_data)

            return Response({
                "status": "success",
                "orders": data
            })

        except Exception as e:
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
        try:
            order_number = request.data.get('order_number')
            new_status = request.data.get('new_status')

            if not order_number or new_status is None:
                return Response({
                    "status": "error",
                    "message": "order_number and new_status are required."
                }, status=status.HTTP_400_BAD_REQUEST)

            order = Order.objects.get(order_number=order_number)

            if new_status == 4:
               helper.create_delivery_request(order_number,order)

            invoice_path = None
            if new_status == 6:
                invoice_path = generate_invoice_pdf(order)   
                order.invoice_path = f"order_invoices/{invoice_path['filename']}"
            order.status = int(new_status)
            order.save()          

            # Send email via common function
            send_order_status_email(order)

            return Response({
                "status": "success",
                "message": f"Order #{order_number} status updated and customer notified."
            })

        except Order.DoesNotExist:
            return Response({
                "status": "error",
                "message": f"Order with number {order_number} not found."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
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
        try:
            user_id = request.data.get('user_id')
            user = User.objects.filter(id=user_id).first()
            if not user:
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
                full_image_url = f"{config_data}/media/{image_profile}"

                address_details = {
                    "full_name": full_name,
                    "restaurant_name": order.restaurant.restaurant_name,
                    "restaurant_image": full_image_url,
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
                        "buy_one_get_one_free": item.buy_one_get_one_free,
                    })

                order_data = {
                    "order_number": order.order_number,
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

            return Response({
                "status": "success",
                "orders": data
            })

        except Exception as e:
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
        if not order_id:
            return Response(
                {"status": "error", "message": "order_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.select_related("delivery_address", "restaurant").get(order_number=order_id)
        except Order.DoesNotExist:
            return Response({"status": "error", "message": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        delivery_address = order.delivery_address
        restaurant = order.restaurant

        if not delivery_address or not delivery_address.latitude or not delivery_address.longitude:
            return Response({"status": "error", "message": "Delivery address location not found."},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            restaurant_location = restaurant.restaurant_location
        except RestaurantLocation.DoesNotExist:
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
        try:
            order_number = request.data.get("order_number")
            latitude = request.data.get("latitude")
            longitude = request.data.get("longitude")

            if not order_number or latitude is None or longitude is None:
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

            return Response({
                "status": "success",
                "message": message
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class GetActiveOrders(APIView):
    """
    Handles tracking orders for a user.
    """

    def post(self, request, *args, **kwargs):
        try:
            user_id = request.data.get('user_id')
            user = User.objects.filter(id=user_id).first()
            if not user:
                return Response({"status": "error", "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            orders = Order.objects.filter(user_id=user_id).exclude(status__in=[6, 7, 8])
            data = []
            for order in orders:

                order_data = {
                    "order_number": order.order_number,
                    "status": order.get_status_display(),
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                }

                data.append(order_data)

            return Response({
                "status": "success",
                "orders": data
            })

        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

@method_decorator(csrf_exempt, name='dispatch')
class MarkAsPaid(APIView):
    """
    API endpoint to receive and store/update live location updates from restaurant during delivery.
    """

    def post(self, request, order_number, *args, **kwargs):
        try:

            Order.objects.filter(order_number=order_number).update(payment_status=5)
            message = "Order Marked As Paid"
            return Response({
                "status": "success",
                "message": message
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# @method_decorator(csrf_exempt, name='dispatch')
# class ApplyCouponOrder(APIView):

#     def post(self, request, *args, **kwargs):
#         try:
#             coupon_code = request.data.get('code')
#             order_amount = request.data.get('order_amount')
#             restaurant_id = request.data.get('restaurant_id')
#             user_id = request.data.get('user_id')

#             if not all([coupon_code, order_amount, restaurant_id, user_id]):
#                 return Response({
#                     "status": "error",
#                     "message": "All fields (coupon_code, order_amount, restaurant_id, user_id) are required."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             try:
#                 coupon = Coupon.objects.get(code=coupon_code)
#             except Coupon.DoesNotExist:
#                 return Response({
#                     "status": "error",
#                     "message": "Invalid coupon code."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             now = timezone.now()
#             if not (coupon.is_active and coupon.valid_from <= now <= coupon.valid_to):
#                 return Response({
#                     "status": "error",
#                     "message": "Coupon is either inactive or expired."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             try:
#                 order_amount = float(order_amount)
#             except (ValueError, TypeError):
#                 return Response({
#                     "status": "error",
#                     "message": "Invalid order amount."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             if order_amount < float(coupon.minimum_order_amount):
#                 return Response({
#                     "status": "error",
#                     "message": f"Minimum order amount should be ₹{coupon.minimum_order_amount} to apply this coupon."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             coupon_discount_value = float(coupon.discount_value) if isinstance(coupon.discount_value, Decimal) else coupon.discount_value

#             if coupon.discount_type == 'percentage':
#                 discount_amount = (coupon_discount_value / 100) * order_amount
#             else:
#                 discount_amount = coupon_discount_value
            
#             discount_amount = min(discount_amount, order_amount)
#             final_total_amount = max(order_amount - discount_amount, 0)

#             return Response({
#                 "status": "success",
#                 "message": "Coupon applied successfully!",
#                 "discount_amount": round(discount_amount, 2),
#                 "final_total_amount": round(final_total_amount, 2)
#             }, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({
#                 "status": "error",
#                 "message": "Something went wrong while applying the coupon.",
#                 "error_details": str(e)
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@method_decorator(csrf_exempt, name='dispatch')
class ApplyCouponOrder(APIView):
    def post(self, request, *args, **kwargs):
        try:
            coupon_code = request.data.get('code')
            order_amount = request.data.get('order_amount')
            restaurant_id = request.data.get('restaurant_id')
            user_id = request.data.get('user_id')

            # Validate required fields
            if not all([coupon_code, order_amount, restaurant_id, user_id]):
                return Response({
                    "status": "error",
                    "message": "All fields (code, order_amount, restaurant_id, user_id) are required."
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                order_amount = float(order_amount)
            except (ValueError, TypeError):
                return Response({
                    "status": "error",
                    "message": "Invalid order amount."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get the coupon/offer
            try:
                offer = OfferDetail.objects.get(
                    code=coupon_code,
                    offer_type='coupon_code',
                    is_active=True
                )
            except OfferDetail.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Invalid coupon code or coupon not active."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if coupon is valid
            if not offer.is_valid():
                return Response({
                    "status": "error",
                    "message": "Coupon is either inactive or expired."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if coupon is valid for this restaurant
            if offer.restaurant and str(offer.restaurant.restaurant_id) != str(restaurant_id):
                return Response({
                    "status": "error",
                    "message": "This coupon is not valid for the selected restaurant."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check minimum order amount
            if offer.minimum_order_amount and order_amount < float(offer.minimum_order_amount):
                return Response({
                    "status": "error",
                    "message": f"Minimum item amount should be ₹{offer.minimum_order_amount} to apply this coupon."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calculate discount
            discount_amount = 0
            if offer.discount_type and offer.discount_value:
                discount_value = float(offer.discount_value) if isinstance(offer.discount_value, Decimal) else offer.discount_value
                
                if offer.discount_type == 'percentage':
                    discount_amount = (discount_value / 100) * order_amount
                else:  # fixed amount
                    discount_amount = discount_value

            # Ensure discount doesn't exceed order amount
            discount_amount = min(discount_amount, order_amount)
            final_total_amount = max(order_amount - discount_amount, 0)

            # Check for free delivery offers
            free_delivery = False
            if offer.offer_type == 'free_delivery':
                free_delivery = True

            return Response({
                "status": "success",
                "message": "Coupon applied successfully!",
                "discount_amount": round(discount_amount, 2),
                "final_total_amount": round(final_total_amount, 2),
                "free_delivery": free_delivery,
                "offer_type": offer.offer_type,
                "coupon_details": {
                    "code": offer.code,
                    "discount_type": offer.discount_type,
                    "discount_value": str(offer.discount_value) if offer.discount_value else None,
                    "minimum_order_amount": str(offer.minimum_order_amount) if offer.minimum_order_amount else None,
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": "Something went wrong while applying the coupon.",
                "error_details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

