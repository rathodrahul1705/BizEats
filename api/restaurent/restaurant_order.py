from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_UP
import logging
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.emailer.email_notifications import send_order_status_email
from api.models import Cart, Coupon, Device, Order, OrderStatusLog, PaymentMethod, RestaurantMenu, User, DeleteAccountDetails
import json
from django.utils.timezone import now
from django.db import transaction, IntegrityError
from django.db.models import Q 
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments, RestaurantOwnerDetail, RestaurantLocation, RestaurantMenu, UserDeliveryAddress
from api.notifications.notification_payload import track_order_function
from api.notifications.notification_send import send_order_received_notification, send_push_notification
from api.offer.view import check_credit_offer
from api.serializers import OrderPlacementSerializer, RestaurantMasterSerializer, RestaurantSerializerByStatus, RestaurantDetailSerializer, RestaurantMasterNewSerializer, RestaurantMenuSerializer, RestaurantListSerializer, UserDeliveryAddressSerializer
from api.utils.utils import calculate_distance_and_cost
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from math import radians, sin, cos, sqrt, atan2



logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class RestaurantCartAddOrRemove(APIView):
    """
    Handles adding, removing, deleting, and reordering items in the cart.
    """

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests for adding, removing, deleting, or reordering items.
        """
        logger.info("RestaurantCartAddOrRemove POST called")
        try:
            data = json.loads(request.body)
            action = data.get("action")
            user_id = data.get("user_id")
            session_id = data.get("session_id")
            restaurant_id = data.get("restaurant_id")
            item_id = data.get("item_id")
            quantity = data.get("quantity", 1)
            id = data.get("id")
            source = data.get("source")

            logger.debug(
                f"Request data: action={action}, user_id={user_id}, session_id={session_id}, "
                f"restaurant_id={restaurant_id}, item_id={item_id}, quantity={quantity}, id={id}, source={source}"
            )

            if not all([action, restaurant_id, item_id]):
                logger.warning("Missing required fields: action, restaurant_id, or item_id")
                return Response(
                    {"status": "error", "message": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if action == "add":
                return self._add_to_cart(user_id, session_id, restaurant_id, item_id, quantity, source)
            elif action == "remove":
                return self._remove_from_cart(user_id, session_id, restaurant_id, item_id)
            elif action == "delete":
                return self._delete_from_cart(user_id, session_id, restaurant_id, item_id, id)
            elif action == "reorder":
                # Reorder uses the same logic as add, but with source="reorder" for tracking
                return self._add_to_cart(user_id, session_id, restaurant_id, item_id, quantity, source or "reorder")
            else:
                logger.warning(f"Invalid action received: {action}")
                return Response(
                    {"status": "error", "message": "Invalid action"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON payload: {e}")
            return Response(
                {"status": "error", "message": "Invalid JSON payload"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception(f"Unexpected error in RestaurantCartAddOrRemove POST: {e}")
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
    def _add_to_cart(self, user_id, session_id, restaurant_id, item_id, quantity, source):
        """
        Adds an item to the cart or updates its quantity if it already exists.
        """
        logger.info(f"Adding to cart: user_id={user_id}, session_id={session_id}, restaurant_id={restaurant_id}, item_id={item_id}, quantity={quantity}, source={source}")
        try:
            if quantity <= 0:
                logger.warning(f"Invalid quantity {quantity} for item_id={item_id}")
                return Response(
                    {"status": "error", "message": "Quantity must be greater than 0"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            restaurant_menu = RestaurantMenu.objects.filter(id=item_id).first()
            if not restaurant_menu:
                logger.error(f"RestaurantMenu not found for item_id={item_id}")
                return Response(
                    {"status": "error", "message": "Item not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if restaurant_menu.discount_active == 1:
                item_price = restaurant_menu.item_price * (1 - (restaurant_menu.discount_percent / 100))
            else:
                item_price = restaurant_menu.item_price

            if user_id is None and session_id:
                cart = Cart.objects.filter(
                    restaurant_id=restaurant_id,
                    item_id=item_id,
                    session_id=session_id,
                ).exclude(cart_status=5).first()
                
                if cart is not None:
                    cart.quantity += quantity
                    cart.item_price += item_price * quantity  # Multiply by quantity
                    cart.description = restaurant_menu.description
                    cart.discount_percent = restaurant_menu.discount_percent
                    cart.discount_active = restaurant_menu.discount_active
                    cart.buy_one_get_one_free = restaurant_menu.buy_one_get_one_free
                    cart.user_id = user_id
                    cart.save()
                    message = "Item quantity updated in cart"
                    logger.info(f"Guest cart updated: cart_id={cart.id}, new_quantity={cart.quantity}")
                else:
                    Cart.objects.create(
                        user_id=user_id,
                        session_id=session_id,
                        item_price=item_price * quantity,  # Multiply by quantity
                        description=restaurant_menu.description,
                        discount_percent=restaurant_menu.discount_percent,
                        discount_active=restaurant_menu.discount_active,
                        buy_one_get_one_free=restaurant_menu.buy_one_get_one_free,
                        restaurant_id=restaurant_id,
                        item_id=item_id,
                        quantity=quantity,
                    )
                    message = "Item added to cart"
                    logger.info(f"New guest cart item created for session_id={session_id}, item_id={item_id}")
            else:
                cart = Cart.objects.filter(
                    user_id=user_id,
                    restaurant_id=restaurant_id,
                    item_id=item_id,
                ).exclude(cart_status=5).first()

                if cart is not None:
                    cart.quantity += quantity
                    cart.item_price += item_price * quantity  # Multiply by quantity
                    cart.discount_percent = restaurant_menu.discount_percent
                    cart.discount_active = restaurant_menu.discount_active
                    cart.description = restaurant_menu.description
                    cart.buy_one_get_one_free = restaurant_menu.buy_one_get_one_free
                    cart.save()
                    message = "Item quantity updated in cart"
                    logger.info(f"User cart updated: cart_id={cart.id}, new_quantity={cart.quantity}")
                else:
                    Cart.objects.create(
                        user_id=user_id,
                        session_id=session_id,
                        restaurant_id=restaurant_id,
                        item_price=item_price * quantity,  # Multiply by quantity
                        discount_percent=restaurant_menu.discount_percent,
                        discount_active=restaurant_menu.discount_active,
                        description=restaurant_menu.description,
                        buy_one_get_one_free=restaurant_menu.buy_one_get_one_free,
                        item_id=item_id,
                        quantity=quantity,
                    )
                    message = "Item added to cart"
                    logger.info(f"New user cart item created for user_id={user_id}, item_id={item_id}")

            return Response(
                {"status": "success", "message": message},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception(f"Error in _add_to_cart: {e}")
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _remove_from_cart(self, user_id, session_id, restaurant_id, item_id):
        """
        Removes an item from the cart or reduces its quantity.
        """
        logger.info(f"Removing from cart: user_id={user_id}, session_id={session_id}, restaurant_id={restaurant_id}, item_id={item_id}")
        try:
            restaurant_menu = RestaurantMenu.objects.filter(id=item_id).first()
            if not restaurant_menu:
                logger.error(f"RestaurantMenu not found for item_id={item_id}")
                return Response(
                    {"status": "error", "message": "Item not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if user_id is None and session_id:
                cart = Cart.objects.exclude(cart_status=5).get(
                    restaurant_id=restaurant_id,
                    session_id=session_id,
                    item_id=item_id,
                )
            else:
                cart = Cart.objects.exclude(cart_status=5).get(
                    user_id=user_id,
                    restaurant_id=restaurant_id,
                    item_id=item_id,
                )
            
            if restaurant_menu.discount_active == 1:
                item_price = restaurant_menu.item_price * (1 - (restaurant_menu.discount_percent / 100))
            else:
                item_price = restaurant_menu.item_price

            if cart.quantity > 1:
                cart.quantity -= 1
                cart.item_price -= item_price
                cart.save()
                message = "Item quantity reduced in cart"
                logger.info(f"Cart item quantity reduced: cart_id={cart.id}, new_quantity={cart.quantity}")
            else:
                cart.delete()
                message = "Item removed from cart"
                logger.info(f"Cart item deleted: cart_id={cart.id}")

            return Response(
                {"status": "success", "message": message},
                status=status.HTTP_200_OK,
            )

        except Cart.DoesNotExist:
            logger.warning(f"Cart item not found for item_id={item_id}, user_id={user_id}, session_id={session_id}")
            return Response(
                {"status": "error", "message": "Item not found in cart"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.exception(f"Error in _remove_from_cart: {e}")
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _delete_from_cart(self, user_id, session_id, restaurant_id, item_id, id):
        """
        Removes an item from the cart by its primary key.
        """
        logger.info(f"Deleting from cart: id={id}, user_id={user_id}, session_id={session_id}, restaurant_id={restaurant_id}, item_id={item_id}")
        try:
            if id:
                cart = Cart.objects.exclude(cart_status=5).get(id=id)
                cart.delete()
                message = "Item deleted from cart"
                logger.info(f"Cart item deleted by id: {id}")
            else:
                logger.warning("No id provided for delete action")
                return Response(
                    {"status": "error", "message": "Missing cart id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {"status": "success", "message": message},
                status=status.HTTP_200_OK,
            )

        except Cart.DoesNotExist:
            logger.warning(f"Cart item not found for id={id}")
            return Response(
                {"status": "error", "message": "Item not found in cart"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.exception(f"Error in _delete_from_cart: {e}")
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

@method_decorator(csrf_exempt, name='dispatch')
class RestaurantCartList(APIView):
    """
    Fetches cart details for a user (logged-in or guest).
    """
    def post(self, request, *args, **kwargs):
        logger.info("RestaurantCartList POST called")
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            session_id = data.get("session_id")
            logger.debug(f"user_id={user_id}, session_id={session_id}")

            if user_id:
                cart_items = Cart.objects.filter(user_id=user_id).exclude(cart_status=5)
            else:
                cart_items = Cart.objects.filter(session_id=session_id).exclude(cart_status=5)

            cart_details = []
            total_item_count = 0

            for item in cart_items:
                total_item_count += item.quantity
                cart_details.append({
                    "item_id": item.item_id,
                    "item_name": item.item.item_name,
                    "item_price": item.item_price,
                    "quantity": item.quantity,
                    "restaurant_id": item.restaurant_id
                })

            logger.info(f"Returning {len(cart_details)} cart items, total count={total_item_count}")
            return Response({
                "status": "success",
                "cart_details": cart_details,
                "total_item_count": total_item_count,
                "existingCartDetails": [
                    {
                        "restaurant_id": i.restaurant_id,
                        "restaurant_name": i.restaurant.restaurant_name,
                        "restaurant_profile_image": (
                            request.build_absolute_uri(i.restaurant.profile_image.url)
                            if i.restaurant.profile_image else None
                        )
                    }
                    for i in cart_items
                ]
            }, status=status.HTTP_200_OK)

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON: {e}")
            return Response({
                "status": "error",
                "message": "Invalid JSON payload",
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Error in RestaurantCartList: {e}")
            return Response({
                "status": "error",
                "message": str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class CartWithRestaurantDetails(APIView):
    """
    Fetches cart details along with restaurant menu and allows updating quantity.
    """

    def post(self, request, *args, **kwargs):
        logger.info("CartWithRestaurantDetails API called")

        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            session_id = data.get("session_id")
            restaurant_id = data.get("restaurant_id")
            address_id = data.get("address_id")

            logger.debug(
                f"Request Data: user_id={user_id}, session_id={session_id}, "
                f"restaurant_id={restaurant_id}, address_id={address_id}"
            )

            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)
            logger.info(f"Restaurant found: {restaurant.restaurant_name} (ID={restaurant.restaurant_id})")

            if user_id:
                cart_items = Cart.objects.filter(
                    user_id=user_id,
                    restaurant_id=restaurant_id
                ).exclude(cart_status=5)
                logger.debug(f"Fetched {cart_items.count()} cart items for user_id={user_id}")
            else:
                cart_items = Cart.objects.filter(
                    session_id=session_id,
                    restaurant_id=restaurant_id
                ).exclude(cart_status=5)
                logger.debug(f"Fetched {cart_items.count()} cart items for session_id={session_id}")

            cart_details = []
            subtotal = 0

            for item in cart_items:
                restaurant_menu = RestaurantMenu.objects.filter(id=item.item_id).first()
                item_total_price = float(item.item_price)
                subtotal += item_total_price

                logger.debug(
                    f"Cart item: item_id={item.item_id}, qty={item.quantity}, price={item_total_price}"
                )

                cart_details.append({
                    "item_id": item.item_id,
                    "id": item.id,
                    "restaurant_id": item.restaurant_id,
                    "item_name": item.item.item_name,
                    "item_description": item.description,
                    "discount_active": item.discount_active,
                    "type": restaurant_menu.food_type if restaurant_menu else None,
                    "discount_percent": item.discount_percent,
                    "item_price": item_total_price,
                    "original_item_price": float(restaurant_menu.item_price * item.quantity) if restaurant_menu else 0,
                    "buy_one_get_one_free": item.buy_one_get_one_free,
                    "quantity": item.quantity,
                    "item_image": request.build_absolute_uri(item.item.item_image.url) if item.item.item_image else None,
                })

            logger.info(f"Subtotal calculated: {subtotal}")

            # Suggestions
            cart_item_ids = [item.item_id for item in cart_items]
            current_time = datetime.now().time()
            suggestion_items_qs = (
                RestaurantMenu.objects.filter(
                    restaurant_id=restaurant_id,
                    availability=True,
                )
                .filter(
                    Q(start_time__isnull=True) | Q(start_time__lte=current_time),
                    Q(end_time__isnull=True) | Q(end_time__gte=current_time),
                )
                .exclude(id__in=cart_item_ids)[:5]
            )

            suggestion_cart_items = []
            for item in suggestion_items_qs:
                original_price = float(item.item_price)
                discount_percent = float(item.discount_percent or 0)
                discounted_price = (
                    original_price - (original_price * discount_percent / 100)
                    if discount_percent > 0 else original_price
                )
                suggestion_cart_items.append({
                    "item_name": item.item_name,
                    "item_description": item.description,
                    "discount_active": item.discount_active,
                    "discount_percent": discount_percent,
                    "item_id": item.id,
                    "original_item_price": original_price,
                    "buy_one_get_one_free": item.buy_one_get_one_free,
                    "quantity": 1,
                    "item_price": round(discounted_price, 2),
                    "type": item.food_type,
                    "item_image": request.build_absolute_uri(item.item_image.url) if item.item_image else None
                })

            logger.debug(f"Generated {len(suggestion_cart_items)} suggestions")

            # Delivery Address & Distance
            delivery_address_details = {}
            delivery_amount = 0
            distance_km = 0

            if address_id:
                try:
                    if user_id:
                        address_obj = UserDeliveryAddress.objects.get(
                            id=address_id,
                            user_id=user_id
                        )
                    else:
                        address_obj = UserDeliveryAddress.objects.get(id=address_id)

                    logger.info(f"Delivery address found: address_id={address_id}")

                    # Address Details
                    delivery_address_details = {
                        "id": address_obj.id,
                        "user_id": address_obj.user_id if address_obj.user_id else None,
                        "receiver_name": getattr(address_obj, "receiver_name", None),
                        "receiver_phone": getattr(address_obj, "receiver_phone", None),
                        "house_no": getattr(address_obj, "house_no", None),
                        "floor": getattr(address_obj, "floor", None),
                        "landmark": getattr(address_obj, "landmark", None),
                        "street_address": address_obj.street_address,
                        "city": address_obj.city,
                        "state": getattr(address_obj, "state", None),
                        "country": getattr(address_obj, "country", None),
                        "postal_code": getattr(address_obj, "zip_code", None),
                        "latitude": getattr(address_obj, "latitude", None),
                        "longitude": getattr(address_obj, "longitude", None),
                        "address_type": getattr(address_obj, "address_type", None),
                        "is_default": getattr(address_obj, "is_default", False),
                    }

                    location_data = calculate_distance_and_cost(
                        restaurant_id,
                        address_id
                    )

                    if "error" in location_data:
                        logger.error(
                            f"Distance calculation error: {location_data['error']}"
                        )
                        return self._error_response(
                            location_data["error"],
                            status.HTTP_400_BAD_REQUEST
                        )

                    delivery_amount = location_data["estimated_delivery_cost"]
                    distance_km = location_data["distance_km"]

                    logger.info(
                        f"Distance: {distance_km} km, delivery cost: {delivery_amount}"
                    )

                except UserDeliveryAddress.DoesNotExist:
                    logger.warning(f"Address not found: address_id={address_id}")
                    delivery_address_details = {"error": "Address not found"}

            # Billing
            tax = 0
            total = subtotal + delivery_amount + tax
            billing_details = {
                "subtotal": round(subtotal),
                "delivery_amount": delivery_amount,
                "distance_km": distance_km,
                "tax": tax,
                "total": round(total),
                "currency": "INR",
            }
            logger.info(f"Billing details: {billing_details}")

            order_count = Order.objects.filter(user_id=user_id).count() if user_id else 0
            offer_response = check_credit_offer(
                offer_type="free_delivery",
                sub_filter="new_user"
            )
            delivery_offer_exist = bool(offer_response.get("data")) and order_count < 3
            logger.info(f"Order count={order_count}, delivery_offer_exist={delivery_offer_exist}")

            payment_method_details = PaymentMethod.objects.filter(is_active=True).values(
                'id',
                'name',
                'code',
                'is_active',
                'created_at'
            )

            return Response({
                "status": "success",
                "restaurant_name": restaurant.restaurant_name,
                "restaurant_status": restaurant.restaurant_status,
                "cart_details": cart_details,
                "suggestion_cart_items": suggestion_cart_items,
                "delivery_address_details": delivery_address_details,
                "delivery_time": {
                    "estimated_time": "30-45 mins",
                    "is_express_available": True
                },
                "billing_details": billing_details,
                "delivery_offer_exist": delivery_offer_exist,
                "order_count": order_count,
                "payment_method_details": payment_method_details
            }, status=status.HTTP_200_OK)

        except RestaurantMaster.DoesNotExist:
            logger.error(f"Restaurant not found: restaurant_id={restaurant_id}")
            return Response(
                {"status": "error", "message": "Restaurant not found"},
                status=404
            )
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON: {e}")
            return Response(
                {"status": "error", "message": "Invalid JSON"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Unexpected error in CartWithRestaurantDetails API")
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )      
        
    def _error_response(self, message, status_code, error_detail=None):
        """Helper for consistent error responses"""
        response = {
            "status": "error",
            "message": message,
            **({"error_details": error_detail} if error_detail else {})
        }
        return Response(response, status=status_code)
    

@method_decorator(csrf_exempt, name='dispatch')
class CartWithRestaurantDetailsClear(APIView):
    """
    Clears all cart details for a given session_id or user_id.
    """

    def post(self, request, *args, **kwargs):
        logger.info("CartWithRestaurantDetailsClear POST called")
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            session_id = data.get("session_id")
            logger.debug(f"user_id={user_id}, session_id={session_id}")

            if not user_id and not session_id:
                logger.warning("Missing user_id and session_id")
                return Response({"status": "error", "message": "user_id or session_id required"}, status=400)

            if user_id:
                deleted_count, _ = Cart.objects.filter(user_id=user_id).exclude(cart_status=5).delete()
            else:
                deleted_count, _ = Cart.objects.filter(session_id=session_id).exclude(cart_status=5).delete()

            logger.info(f"Deleted {deleted_count} cart items")
            return Response({
                "status": "success",
                "message": f"Deleted {deleted_count} items from cart"
            }, status=status.HTTP_200_OK)

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON: {e}")
            return Response({
                "status": "error",
                "message": "Invalid JSON payload",
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Error clearing cart: {e}")
            return Response({
                "status": "error",
                "message": str(e),
            }, status=status.HTTP_400_BAD_REQUEST)


class UserDeliveryAddressCreateView(generics.CreateAPIView):
    """API to create a new delivery address."""
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        logger.info(f"Creating new delivery address for user_id={self.request.user.id}")
        try:
            address = serializer.save(user=self.request.user)
            logger.info(f"Address created with id={address.id}")
        except Exception as e:
            logger.exception(f"Failed to create address for user_id={self.request.user.id}: {e}")
            raise


class UserDeliveryAddressUpdateView(generics.RetrieveUpdateAPIView):
    """API to update an existing address."""
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDeliveryAddress.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        logger.info(f"Updating delivery address id={self.kwargs.get('pk')} for user_id={self.request.user.id}")
        try:
            serializer.save()
            logger.info("Address updated successfully")
        except Exception as e:
            logger.exception(f"Failed to update address: {e}")
            raise


class UserDeliveryAddressDeleteView(generics.DestroyAPIView):
    """API to delete an existing user address."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDeliveryAddress.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        logger.info(f"Deleting delivery address id={instance.id} for user_id={self.request.user.id}")
        try:
            instance.delete()
            logger.info("Address deleted successfully")
        except Exception as e:
            logger.exception(f"Failed to delete address: {e}")
            raise


class SetDefaultAddressView(generics.UpdateAPIView):
    """API to set or unset an address as the default for the user."""
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        logger.info(f"SetDefaultAddressView called for user_id={request.user.id}, address_id={kwargs.get('pk')}")
        address_id = kwargs.get('pk')
        user = request.user
        is_default = request.data.get('is_default', False)
        logger.debug(f"is_default={is_default}")

        try:
            address = UserDeliveryAddress.objects.get(pk=address_id, user=user)
        except UserDeliveryAddress.DoesNotExist:
            logger.warning(f"Address not found: id={address_id}")
            return Response({"detail": "Address not found."}, status=status.HTTP_404_NOT_FOUND)

        if is_default:
            # Set all other addresses to is_default=False
            updated = UserDeliveryAddress.objects.filter(user=user).update(is_default=False)
            address.is_default = True
            address.save()
            logger.info(f"Default address set to id={address_id}, cleared {updated} others")
            return Response({"detail": "Default address updated successfully."}, status=status.HTTP_200_OK)
        else:
            if address.is_default:
                address.is_default = False
                address.save()
                logger.info(f"Unset default address id={address_id}")
                return Response({"detail": "Address unset as default."}, status=status.HTTP_200_OK)
            else:
                logger.info(f"No change: address id={address_id} was not default")
                return Response({"detail": "No changes made."}, status=status.HTTP_200_OK)


class UserDeliveryAddressListCreateView(generics.ListCreateAPIView):
    serializer_class = UserDeliveryAddressSerializer
    # permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = UserDeliveryAddress.objects.filter(user=self.request.user).order_by('-id')
        logger.debug(f"Listing {qs.count()} addresses for user_id={self.request.user.id}")
        return qs

    def perform_create(self, serializer):
        logger.info(f"Creating new address for user_id={self.request.user.id}")
        try:
            address = serializer.save(user=self.request.user)
            logger.info(f"Address created with id={address.id}")
        except Exception as e:
            logger.exception(f"Failed to create address: {e}")
            raise


# ✅ Retrieve, Update & Delete Address
class UserDeliveryAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDeliveryAddress.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        logger.info(f"Updating address id={self.kwargs.get('pk')} for user_id={self.request.user.id}")
        try:
            serializer.save(user=self.request.user)
            logger.info("Address updated")
        except Exception as e:
            logger.exception(f"Failed to update address: {e}")
            raise

    def perform_destroy(self, instance):
        logger.info(f"Deleting address id={instance.id} for user_id={self.request.user.id}")
        try:
            instance.delete()
            logger.info("Address deleted")
        except Exception as e:
            logger.exception(f"Failed to delete address: {e}")
            raise


class CartWithRestaurantUserUpdate(APIView):
    def post(self, request, *args, **kwargs):
        logger.info("CartWithRestaurantUserUpdate POST called (dummy)")
        return Response(
            {
                "status": "success",
                "message": "Dummy response"
            },
            status=status.HTTP_200_OK
        )


@method_decorator(csrf_exempt, name='dispatch')
class RestaurantOrderDetailsAPI(APIView):
    """
    Optimized POST-only API for restaurant order details
    Requires JSON payload: {"restaurant_id": "BIZ23154878", "user_id": 1, "delivery_address_id": 12}
    """
    
    REQUIRED_FIELDS = {'restaurant_id', 'user_id', 'delivery_address_id'}
    
    def post(self, request, *args, **kwargs):
        logger.info("RestaurantOrderDetailsAPI POST called")
        try:
            missing_fields = self.REQUIRED_FIELDS - set(request.data.keys())
            if missing_fields:
                logger.warning(f"Missing required fields: {', '.join(missing_fields)}")
                return self._error_response(
                    f"Missing required fields: {', '.join(missing_fields)}",
                    status.HTTP_400_BAD_REQUEST
                )
            
            restaurant_id = request.data['restaurant_id']
            user_id = request.data['user_id']
            delivery_address_id = request.data['delivery_address_id']
            logger.debug(f"restaurant_id={restaurant_id}, user_id={user_id}, delivery_address_id={delivery_address_id}")

            restaurant = self._get_restaurant_with_location(restaurant_id)
            if not restaurant:
                logger.warning(f"Restaurant not found: {restaurant_id}")
                return self._error_response("Restaurant not found", status.HTTP_404_NOT_FOUND)

            cart_items = self._get_user_cart_items(user_id, restaurant_id)
            logger.debug(f"Found {cart_items.count()} cart items")

            location_data = calculate_distance_and_cost(restaurant_id, delivery_address_id)
            if "error" in location_data:
                logger.error(f"Distance calculation error: {location_data['error']}")
                return self._error_response(location_data["error"], status.HTTP_400_BAD_REQUEST)

            response_data = {
                "status": "success",
                "restaurant_details": self._build_restaurant_details(restaurant),
                "restaurant_coordinates": location_data["restaurant_coordinates"],
                "user_coordinates": location_data["user_coordinates"],
                "distance_km": location_data["distance_km"],
                "estimated_delivery_cost": location_data["estimated_delivery_cost"],
                "order_summary": self._build_order_summary(cart_items)
            }
            logger.info("Order details generated successfully")
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error in RestaurantOrderDetailsAPI: {e}")
            return self._error_response(
                "An error occurred while processing your request",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_detail=str(e)
            )

    def _get_restaurant_with_location(self, restaurant_id):
        return (RestaurantMaster.objects
                .filter(restaurant_id=restaurant_id)
                .select_related('restaurant_location')
                .first())

    def _get_user_cart_items(self, user_id, restaurant_id):
        return (Cart.objects
                .filter(user_id=user_id, restaurant_id=restaurant_id)
                .exclude(cart_status=5)
                .select_related('item')
                .only('quantity', 'item__id', 'item__item_name', 'item__item_price'))

    def _build_restaurant_details(self, restaurant):
        location = restaurant.restaurant_location
        address_parts = filter(None, [
            location.shop_no_building,
            location.floor_tower,
            location.area_sector_locality,
            f"Near {location.nearby_locality}" if location.nearby_locality else None,
            location.city
        ])
        return {
            "restaurant_name": restaurant.restaurant_name,
            "restaurant_address": ", ".join(address_parts)
        }

    def _build_order_summary(self, cart_items):
        item_details = [{
            "item_id": item.item.id,
            "item_name": item.item.item_name,
            "quantity": item.quantity,
            "unit_price": item.item_price,
            "total_price": round(item.item_price)
        } for item in cart_items]
        total_amount = sum(item['total_price'] for item in item_details)
        return {
            "number_of_items": len(item_details),
            "total_order_amount": round(total_amount, 2),
            "currency": "INR",
            "item_details": item_details
        }

    def _error_response(self, message, status_code, error_detail=None):
        response = {
            "status": "error",
            "message": message,
            **({"error_details": error_detail} if error_detail else {})
        }
        return Response(response, status=status_code)


@method_decorator(csrf_exempt, name='dispatch')
class PlaceOrderAPI(APIView):

    def post(self, request, *args, **kwargs):
        logger.info("PlaceOrderAPI called with data: %s", request.data)

        try:
            with transaction.atomic():
                serializer = OrderPlacementSerializer(data=request.data)
                if not serializer.is_valid():
                    logger.error("Serializer errors: %s", serializer.errors)
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

                data = serializer.validated_data
                logger.info("Validated data: %s", data)

                cart_items = Cart.objects.select_related('item').filter(
                    user_id=data['user_id'],
                    restaurant_id=data['restaurant_id'],
                    cart_status__in=[1, 2, 3, 4]
                )
                if not cart_items.exists():
                    logger.warning(f"No cart items for user_id={data['user_id']}, restaurant_id={data['restaurant_id']}")
                    return Response(
                        {"status": "error", "message": "No items in cart"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                coupon_id = None
                discount_amount = Decimal('0.00')
                if data.get('code'):
                    try:
                        coupon = Coupon.objects.get(code=data['code'])
                        coupon_id = coupon.id
                        discount_amount = data.get('discount_amount', Decimal('0.00'))
                        logger.info(f"Coupon applied: {coupon.code} (id={coupon.id})")
                    except Coupon.DoesNotExist:
                        logger.warning(f"Invalid coupon: {data['code']}")

                subtotal = sum(item.item_price for item in cart_items)
                tax = subtotal * Decimal('0.00')
                delivery_fee = Decimal(str(data['delivery_fee']))
                calculated_total = subtotal + tax + delivery_fee - discount_amount
                if Decimal(str(data['total_amount'])) != calculated_total:
                    logger.warning(f"Total mismatch! frontend={data['total_amount']}, backend={calculated_total}")
                total = calculated_total

                order_number = data.get('order_number') or self._generate_order_number()
                logger.info(f"Using order number: {order_number}")

                current_time = datetime.now()
                future_time = current_time + timedelta(minutes=45)

                order, created = Order.objects.update_or_create(
                    order_number=order_number,
                    defaults={
                        "coupon_id": coupon_id,
                        "coupon_discount": discount_amount,
                        "user_id": data['user_id'],
                        "restaurant_id": data['restaurant_id'],
                        "status": 1,
                        "payment_status": data['payment_status'],
                        "payment_method": data['payment_method'],
                        "payment_type": data['payment_type'],
                        "subtotal": subtotal,
                        "delivery_fee": delivery_fee,
                        "tax": tax,
                        "delivery_date": future_time,
                        "quantity": 1,
                        "total_amount": total,
                        "delivery_address_id": data.get('delivery_address_id'),
                        "special_instructions": data.get('special_instructions'),
                        "is_takeaway": data.get('is_takeaway', False),
                        "preparation_time": self._estimate_prep_time(cart_items),
                    }
                )
                logger.info(f"Order saved: ID={order.id}, Number={order.order_number}, Created={created}")

                OrderStatusLog.objects.create(
                    order=order,
                    status=1,
                    notes="Order placed successfully"
                )
                logger.debug("OrderStatusLog created")

                updated_count = Cart.objects.filter(
                    user_id=data['user_id'],
                    restaurant_id=data['restaurant_id'],
                    cart_status__in=[1, 2, 3, 4],
                    order_number__isnull=True
                ).update(
                    cart_status=5,
                    order_number=order.order_number
                )
                
                logger.info(f"Updated {updated_count} cart items to status=5")

                try:
                    send_order_status_email(order)
                except Exception as e:
                    logger.warning(f"Email sending failed: {e}")

                payload = {
                    "user_id": data['user_id'],
                    "order_number": order.order_number
                }
                title = "Order Update"
                customer_body = "Your order has been placed successfully"
                order_no_for_push = order.order_number

                try:
                    response_body = track_order_function(payload, None)
                    if response_body.get('status') == "success":
                        customer_body = response_body.get('body', customer_body)
                        title = response_body.get('title', title)
                        order_no_for_push = response_body.get('order_number', order_no_for_push)
                except Exception as e:
                    logger.warning(f"Track order failed: {e}")

                restaurant_token = (
                    Device.objects
                    .filter(user_id=order.restaurant.user_id)
                    .order_by('-id')
                    .values_list('token', flat=True)
                    .first()
                )
                customer_token = (
                    Device.objects
                    .filter(user_id=order.user_id)
                    .order_by('-id')
                    .values_list('token', flat=True)
                    .first()
                )
                logger.debug(f"Restaurant token present: {bool(restaurant_token)}, Customer token present: {bool(customer_token)}")

                restaurant_response = None
                customer_response = None
                if restaurant_token:
                    restaurant_response = send_order_received_notification(restaurant_token, order)
                    logger.info("Restaurant notification sent")
                else:
                    logger.warning("No restaurant token found")

                if customer_token:
                    customer_response = send_push_notification(
                        tokens=[customer_token],
                        title=title,
                        body=customer_body,
                        order_number=order_no_for_push,
                        data=None
                    )
                    logger.info("Customer notification sent")
                else:
                    logger.warning("No customer token found")

                return Response({
                    "status": "success",
                    "order_number": order.order_number,
                    "order_id": order.id,
                    "total_amount": str(order.total_amount),
                    "restaurant_response": restaurant_response,
                    "customer_response": customer_response,
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception(f"Order creation failed: {e}")
            return Response(
                {"status": "error", "message": "Something went wrong"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_order_number(self):
        from django.utils.timezone import now, timedelta
        today_str = now().strftime('%Y%m%d')
        last_order = Order.objects.filter(
            order_number__startswith=f'ORD{today_str}-'
        ).order_by('-order_number').first()

        if last_order:
            last_seq = int(last_order.order_number.split('-')[-1])
            new_seq = last_seq + 1
        else:
            new_seq = 1

        order_no = f'ORD{today_str}-{new_seq:04d}'
        logger.info(f"Generated order number: {order_no}")
        return order_no

    def _estimate_prep_time(self, cart_items):
        base_time = 15
        item_time = sum(item.item.preparation_time * item.quantity for item in cart_items)
        prep_time = min(base_time + item_time, 120)
        logger.debug(f"Estimated prep time: {prep_time} minutes")
        return prep_time


# class GetAddressByFilter(APIView):
#     def post(self, request):
#         logger.info("GetAddressByFilter POST called")
#         try:
#             lat = request.data.get("lat")
#             long = request.data.get("long")
#             isGuest = request.data.get("isGuest")
#             logger.debug(f"lat={lat}, long={long}, isGuest={isGuest}")

#             if not lat or not long:
#                 logger.warning("Missing latitude or longitude")
#                 return Response(
#                     {"detail": "Latitude and Longitude are required"},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             latitude = Decimal(str(lat))
#             longitude = Decimal(str(long))

#             if isGuest:
#                 full_address = self.get_address_from_google(latitude, longitude)
#                 logger.info(f"Guest user location: lat={latitude}, lon={longitude}")
#                 return Response(
#                     {
#                         "is_guest": True,
#                         "isGuest": isGuest,
#                         "latitude": latitude,
#                         "longitude": longitude,
#                         "full_address": full_address,
#                         "home_type": "Delivering",
#                         "detail": "Default location for guest user"
#                     },
#                     status=status.HTTP_200_OK
#                 )

#             if not request.user.is_authenticated:
#                 logger.warning("Unauthenticated user but isGuest=False")
#                 return Response(
#                     {"detail": "Authentication required"},
#                     status=status.HTTP_401_UNAUTHORIZED
#                 )

#             address = UserDeliveryAddress.objects.filter(
#                 user=request.user,
#                 latitude=latitude,
#                 longitude=longitude
#             ).first()

#             if address:
#                 serializer = UserDeliveryAddressSerializer(address)
#                 data = serializer.data
#                 if address.home_type == "Other" and address.name_of_location:
#                     data["home_type"] = address.name_of_location
#                 logger.info(f"Found address in DB for user {request.user.id}, id={address.id}")
#                 return Response(data, status=status.HTTP_200_OK)

#             # Fallback to Google
#             full_address = self.get_address_from_google(latitude, longitude)
#             logger.info(f"Address not in DB, fetched from Google: {full_address}")
#             return Response(
#                 {
#                     "detail": "Address not found in DB",
#                     "latitude": latitude,
#                     "longitude": longitude,
#                     "full_address": full_address
#                 },
#                 status=status.HTTP_200_OK
#             )

#         except Exception as e:
#             logger.exception(f"Error in GetAddressByFilter: {e}")
#             return Response(
#                 {"error": str(e)},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#     def get_address_from_google(self, latitude, longitude):
#         try:
#             GOOGLE_API_KEY = settings.GOOGLE_MAP_API_KEY
#             url = (
#                 "https://maps.googleapis.com/maps/api/geocode/json"
#                 f"?latlng={latitude},{longitude}&key={GOOGLE_API_KEY}"
#             )
#             response = requests.get(url, timeout=5)
#             if response.status_code == 200:
#                 results = response.json().get("results")
#                 if results:
#                     return results[0].get("formatted_address")
#         except Exception as e:
#             logger.warning(f"Google geocode failed: {e}")
#         return None
class GetAddressByFilter(APIView):

    SEARCH_RADIUS = 30  # meters
    BOUNDING_BOX = Decimal("0.0005")  # ~55 meters

    def post(self, request):
        logger.info("GetAddressByFilter POST called")

        try:
            lat = request.data.get("lat")
            long = request.data.get("long")
            isGuest = request.data.get("isGuest")

            logger.debug(f"lat={lat}, long={long}, isGuest={isGuest}")

            if lat is None or long is None:
                return Response(
                    {"detail": "Latitude and Longitude are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            latitude = Decimal(str(lat))
            longitude = Decimal(str(long))

            # ---------------- Guest User ----------------
            if isGuest:
                full_address = self.get_address_from_google(latitude, longitude)

                return Response(
                    {
                        "is_guest": True,
                        "isGuest": True,
                        "latitude": latitude,
                        "longitude": longitude,
                        "full_address": full_address,
                        "home_type": "Delivering",
                        "detail": "Default location for guest user",
                    },
                    status=status.HTTP_200_OK,
                )

            # ---------------- Authentication ----------------
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # ---------------- Find Nearby Saved Addresses ----------------
            addresses = UserDeliveryAddress.objects.filter(
                user=request.user,
                latitude__range=(
                    latitude - self.BOUNDING_BOX,
                    latitude + self.BOUNDING_BOX,
                ),
                longitude__range=(
                    longitude - self.BOUNDING_BOX,
                    longitude + self.BOUNDING_BOX,
                ),
            )

            closest_address = None
            min_distance = float("inf")

            for addr in addresses:
                distance = self.haversine(
                    latitude,
                    longitude,
                    addr.latitude,
                    addr.longitude,
                )

                if distance < min_distance:
                    min_distance = distance
                    closest_address = addr

            # ---------------- Address Found ----------------
            if (
                closest_address is not None
                and min_distance <= self.SEARCH_RADIUS
            ):
                serializer = UserDeliveryAddressSerializer(closest_address)
                data = serializer.data

                if (
                    closest_address.home_type == "Other"
                    and closest_address.name_of_location
                ):
                    data["home_type"] = closest_address.name_of_location

                data["distance"] = round(min_distance, 2)

                logger.info(
                    f"Saved address found: "
                    f"{closest_address.id} "
                    f"Distance: {min_distance:.2f} meters"
                )

                return Response(data, status=status.HTTP_200_OK)

            # ---------------- Fallback Google ----------------
            full_address = self.get_address_from_google(
                latitude,
                longitude,
            )

            return Response(
                {
                    "detail": "Address not found in saved addresses",
                    "latitude": latitude,
                    "longitude": longitude,
                    "full_address": full_address,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception(e)

            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def haversine(self, lat1, lon1, lat2, lon2):
        """
        Returns distance in meters.
        """

        R = 6371000

        lat1 = float(lat1)
        lon1 = float(lon1)
        lat2 = float(lat2)
        lon2 = float(lon2)

        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)

        a = (
            sin(dlat / 2) ** 2
            + cos(radians(lat1))
            * cos(radians(lat2))
            * sin(dlon / 2) ** 2
        )

        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c

    def get_address_from_google(self, latitude, longitude):
        try:
            GOOGLE_API_KEY = settings.GOOGLE_MAP_API_KEY

            url = (
                "https://maps.googleapis.com/maps/api/geocode/json"
                f"?latlng={latitude},{longitude}&key={GOOGLE_API_KEY}"
            )

            response = requests.get(url, timeout=5)

            if response.status_code == 200:
                results = response.json().get("results", [])

                if results:
                    return results[0]["formatted_address"]

        except Exception as e:
            logger.warning(f"Google geocode failed: {e}")

        return None

@method_decorator(csrf_exempt, name='dispatch')
class RestaurantCartReOrder(APIView):
    """
    API endpoint to reorder items from a previous order.
    - Requires user to be logged in.
    - Clears the user's current cart before adding reordered items.
    """

    def post(self, request, order_number, *args, **kwargs):
        logger.info(f"RestaurantCartReOrder POST called for order_number={order_number}, user={request.user.id}")
        try:
            if not request.user.is_authenticated:
                logger.warning("Unauthenticated reorder attempt")
                return Response({
                    "status": "error",
                    "message": "Authentication required. Please log in."
                }, status=status.HTTP_401_UNAUTHORIZED)

            user = request.user
            Cart.objects.filter(user=user).exclude(cart_status=5).delete()
            logger.info(f"Cleared cart for user {user.id}")

            order_items = Cart.objects.filter(order_number=order_number)
            if not order_items.exists():
                logger.warning(f"No items found for order_number={order_number}")
                return Response({
                    "status": "error",
                    "message": "No items found in this order."
                }, status=status.HTTP_404_NOT_FOUND)

            cart_handler = RestaurantCartAddOrRemove()

            for item in order_items:
                cart_handler._add_to_cart(
                    user_id=user.id,
                    session_id=None,
                    restaurant_id=str(item.restaurant_id),
                    item_id=item.item_id,
                    quantity=item.quantity,
                    source="REORDER"
                )
                logger.debug(f"Added item {item.item_id} x{item.quantity} from order {order_number}")

            logger.info(f"Reordered items from order {order_number} into cart for user {user.id}")
            return Response({
                "status": "success",
                "message": "Items from previous order added to cart successfully."
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error in RestaurantCartReOrder: {e}")
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserDataDelete(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk=None):
        """
        SOFT DELETE user account.
        - User can delete own account
        - Admin can delete any account
        """
        logger.info(
            "Account delete requested | requested_by=%s | target_pk=%s",
            request.user.id,
            pk
        )

        try:
            if pk:
                if not request.user.is_staff:
                    logger.warning(
                        "Permission denied | requested_by=%s | target_pk=%s",
                        request.user.id,
                        pk
                    )
                    return Response(
                        {"success": False, "message": "Permission denied"},
                        status=status.HTTP_403_FORBIDDEN
                    )
                user = User.objects.get(pk=pk)
            else:
                user = request.user

            if user.is_deleted:
                logger.info(f"Account already deleted: user_id={user.id}")
                return Response(
                    {"success": False, "message": "Account already deleted"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            reason_text = request.data.get("reason", "")
            reason_type = request.data.get("reason_type")

            user.is_deleted = True
            user.is_active = False
            user.save(update_fields=["is_deleted", "is_active"])
            logger.info(f"User soft deleted: user_id={user.id}")

            DeleteAccountDetails.objects.create(
                user_id=user.id,
                reason_text=reason_text,
                reason_type=reason_type,
                status="processing",
                requested_at=datetime.now(),
                user_email=user.email,
                user_phone=getattr(user, "contact_number", None)
            )
            logger.info(f"DeleteAccountDetails created for user_id={user.id}")

            return Response(
                {
                    "success": True,
                    "message": "Account deactivated successfully. It will be permanently deleted after 30 days.",
                },
                status=status.HTTP_200_OK
            )

        except User.DoesNotExist:
            logger.error(f"User not found | pk={pk}")
            return Response(
                {"success": False, "message": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Account delete failed | error={e}")
            return Response(
                {"success": False, "message": "Failed to delete account"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )