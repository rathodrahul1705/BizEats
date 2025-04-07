from datetime import datetime, timedelta
from decimal import Decimal
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.models import Cart, Order, OrderStatusLog, RestaurantMenu, User, UserDeliveryAddress
import json
from django.db import transaction
from django.db.models import Q 
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from api.serializers import OrderPlacementSerializer
from api.emailer.email_notifications import send_order_status_email

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

