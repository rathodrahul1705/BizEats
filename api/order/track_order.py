from datetime import datetime, timedelta
from decimal import Decimal
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.models import Cart, Order, OrderStatusLog, RestaurantLocation, RestaurantMenu, User, UserDeliveryAddress, OrderLiveLocation
from math import radians, sin, cos, sqrt, atan2
from django.db import transaction
from django.db.models import Q 
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from api.serializers import OrderPlacementSerializer, OrderLiveLocationSerializer
from api.emailer.email_notifications import send_order_status_email
from decouple import config
from django.utils import timezone

@method_decorator(csrf_exempt, name='dispatch')
class TrackOrder(APIView):
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
                    price = menu_item.item_price if menu_item else Decimal(0)
                    item_total = price * item.quantity
                    subtotal += item_total
                    item_details.append({
                        "item_name": menu_item.item_name if menu_item else "Unknown",
                        "quantity": item.quantity,
                        "unit_price": str(price),
                        "total_price": str(item_total),
                    })

                order_data = {
                    "order_number": order.order_number,
                    "restaurant_name": order.restaurant.restaurant_name,
                    "restaurant_contact": order.restaurant.owner_details.owner_contact,
                    "status": order.get_status_display(),
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "delivery_address": address_details,
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                    "items": item_details,
                    "subtotal": str(subtotal),
                    # "total": str(order.total_amount)
                    "total": str(subtotal)
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

                cart_items = Cart.objects.filter(order_number=order.order_number)
                item_details = []
                subtotal = Decimal(0)
                for item in cart_items:
                    menu_item = RestaurantMenu.objects.filter(id=item.item_id).first()
                    price = menu_item.item_price if menu_item else Decimal(0)
                    item_total = price * item.quantity
                    subtotal += item_total
                    item_details.append({
                        "item_name": menu_item.item_name if menu_item else "Unknown",
                        "quantity": item.quantity,
                        "unit_price": str(price),
                        "total_price": str(item_total),
                    })

                order_data = {
                    "full_name": user.full_name,
                    "order_number": order.order_number,
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                    "items": item_details,
                    "subtotal": str(subtotal),
                    "total": str(subtotal),
                    "status": order.status
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
            orders = Order.objects.filter(user_id=user_id,status=6)
            config_data  = config("REACT_APP_BASE_URL")
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
                    price = menu_item.item_price if menu_item else Decimal(0)
                    item_total = price * item.quantity
                    subtotal += item_total
                    item_details.append({
                        "item_name": menu_item.item_name if menu_item else "Unknown",
                        "quantity": item.quantity,
                        "unit_price": str(price),
                        "total_price": str(item_total),
                    })

                order_data = {
                    "order_number": order.order_number,
                    "status": order.get_status_display(),
                    "placed_on": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "delivery_address": address_details,
                    "estimated_delivery": order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available",
                    "items": item_details,
                    "subtotal": str(subtotal),
                    # "total": str(order.total_amount)
                    "total": str(subtotal)
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
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])  # Convert Decimals to floats
        R = 6371  # Radius of Earth in km
        dLat = radians(lat2 - lat1)
        dLon = radians(lon2 - lon1)
        a = sin(dLat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def estimate_time_minutes(self, lat1, lon1, lat2, lon2, speed_kmph=15):
        distance_km = self.haversine_distance(lat1, lon1, lat2, lon2)
        time_hours = distance_km / speed_kmph
        return round(time_hours * 60)  # Return time in minutes

    def post(self, request, *args, **kwargs):
        try:
            order_id = request.data.get("order_id")
            if not order_id:
                return Response(
                    {"status": "error", "message": "order_id is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the order
            order = Order.objects.select_related("delivery_address", "restaurant").get(order_number=order_id)
            live_location = OrderLiveLocation.objects.filter(order_number=order_id).order_by("-timestamp").first()
            delivery_address = order.delivery_address
            restaurant = order.restaurant

            try:
                restaurant_location = restaurant.restaurant_location
            except RestaurantLocation.DoesNotExist:
                return Response(
                    {"status": "error", "message": "Restaurant location not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            if not delivery_address or not delivery_address.latitude or not delivery_address.longitude:
                return Response(
                    {"status": "error", "message": "Delivery address location not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Set live location values
            if live_location:
                live_location_latitude = live_location.latitude
                live_location_longitude = live_location.longitude
            else:
                live_location_latitude = None
                live_location_longitude = None

            # Calculate ETA if delivery agent location is available
            estimated_time_minutes = None
            if live_location_latitude and live_location_longitude:
                estimated_time_minutes = self.estimate_time_minutes(
                    live_location_latitude,
                    live_location_longitude,
                    delivery_address.latitude,
                    delivery_address.longitude
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
                    "lat": live_location_latitude,
                    "lng": live_location_longitude,
                },
                "estimated_time_minutes": estimated_time_minutes
            }, status=status.HTTP_200_OK)

        except Order.DoesNotExist:
            return Response(
                {"status": "error", "message": "Order not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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

            # Check if a live location entry exists
            live_location = OrderLiveLocation.objects.filter(order_number=order_number).order_by("-timestamp").first()

            if live_location:
                # Update the latest location
                live_location.latitude = latitude
                live_location.longitude = longitude
                live_location.timestamp = timezone.now()
                live_location.save()
                message = "Live location updated successfully."
            else:
                # Create a new one
                OrderLiveLocation.objects.create(
                    order_number=order_number,
                    latitude=latitude,
                    longitude=longitude,
                )
                message = "Live location created successfully."

            return Response({
                "status": "success",
                "message": message
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
