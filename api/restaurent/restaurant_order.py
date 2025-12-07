from datetime import datetime, timedelta
from decimal import Decimal, ROUND_UP
import logging
import math
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.emailer.email_notifications import send_order_status_email
from api.models import Cart, Coupon, Order, OrderStatusLog, RestaurantMenu, User
import json
from django.utils.timezone import now
from django.db import transaction, IntegrityError
from django.db.models import Q 
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments, RestaurantOwnerDetail, RestaurantLocation, RestaurantMenu, UserDeliveryAddress
from api.serializers import OrderPlacementSerializer, RestaurantMasterSerializer, RestaurantSerializerByStatus, RestaurantDetailSerializer, RestaurantMasterNewSerializer, RestaurantMenuSerializer, RestaurantListSerializer, UserDeliveryAddressSerializer
from api.utils.utils import calculate_distance_and_cost

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class RestaurantCartAddOrRemove(APIView):
    """
    Handles adding and removing items from the cart.
    """

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests for adding or removing items from the cart.
        """
        try:
            # Parse the JSON payload
            data = json.loads(request.body)
            action = data.get("action")  # "add" or "remove"
            user_id = data.get("user_id")  # Can be null for guest users
            session_id = data.get("session_id")  # For guest users
            restaurant_id = data.get("restaurant_id")
            item_id = data.get("item_id")
            quantity = data.get("quantity", 1)  # Default quantity is 1
            id = data.get("id")  # Default quantity is 1
            source = data.get("source")  # Default quantity is 1

            # Validate required fields
            if not all([action, restaurant_id, item_id]):
                return Response(
                    {"status": "error", "message": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Call the appropriate method based on the action
            if action == "add":
                return self._add_to_cart(user_id, session_id, restaurant_id, item_id, quantity, source)
            elif action == "remove":
                return self._remove_from_cart(user_id, session_id, restaurant_id, item_id)
            elif action == "delete":
                return self._delete_from_cart(user_id, session_id, restaurant_id, item_id, id)
            else:
                return Response(
                    {"status": "error", "message": "Invalid action"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except json.JSONDecodeError:
            return Response(
                {"status": "error", "message": "Invalid JSON payload"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
    def _add_to_cart(self, user_id, session_id, restaurant_id, item_id, quantity, source):
        """
        Adds an item to the cart or updates its quantity if it already exists.
        """

        try:
            # Validate quantity
            if quantity <= 0:
                return Response(
                    {"status": "error", "message": "Quantity must be greater than 0"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            restaurant_menu = RestaurantMenu.objects.filter(
                    id=item_id,
                ).first()

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
                    cart.item_price += item_price
                    cart.description = restaurant_menu.description
                    cart.discount_percent = restaurant_menu.discount_percent
                    cart.discount_active = restaurant_menu.discount_active
                    cart.buy_one_get_one_free = restaurant_menu.buy_one_get_one_free
                    cart.user_id = user_id
                    cart.save()
                    message = "Item quantity updated in cart"

                else:

                    Cart.objects.create(
                        user_id=user_id,
                        session_id=session_id,
                        item_price=item_price,
                        description=restaurant_menu.description,
                        discount_percent = restaurant_menu.discount_percent,
                        discount_active = restaurant_menu.discount_active,
                        buy_one_get_one_free = restaurant_menu.buy_one_get_one_free,
                        restaurant_id=restaurant_id,
                        item_id=item_id,
                        quantity=quantity,
                    )
                    message = "Item added to cart"

            else:
                
                cart = Cart.objects.filter(
                    user_id=user_id,
                    restaurant_id=restaurant_id,
                    item_id=item_id,
                ).exclude(cart_status=5).first()

                if cart is not None:

                    cart.quantity += quantity
                    cart.user_id = user_id
                    cart.item_price += item_price
                    cart.discount_percent = restaurant_menu.discount_percent
                    cart.discount_active = restaurant_menu.discount_active
                    cart.description = restaurant_menu.description
                    restaurant_menu.buy_one_get_one_free
                    cart.save()
                    message = "Item quantity updated in cart"
                    
                else:

                    Cart.objects.create(
                        user_id=user_id,
                        session_id=session_id,
                        restaurant_id=restaurant_id,
                        item_price=item_price,
                        discount_percent = restaurant_menu.discount_percent,
                        discount_active = restaurant_menu.discount_active,
                        description=restaurant_menu.description,
                        buy_one_get_one_free = restaurant_menu.buy_one_get_one_free,
                        item_id=item_id,
                        quantity=quantity,
                    )
                    message = "Item added to cart"

                message = "Item added to cart"

            return Response(
                {"status": "success", "message": message},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _remove_from_cart(self, user_id, session_id, restaurant_id, item_id):
        """
        Removes an item from the cart or reduces its quantity.
        """
        try:

            restaurant_menu = RestaurantMenu.objects.filter(
                    id=item_id,
                ).first()
            
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
            else:
                cart.delete()
                message = "Item removed from cart"

            return Response(
                {"status": "success", "message": message},
                status=status.HTTP_200_OK,
            )

        except Cart.DoesNotExist:
            return Response(
                {"status": "error", "message": "Item not found in cart"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        

    def _delete_from_cart(self, user_id, session_id, restaurant_id, item_id, id):
        """
        Removes an item from the cart or reduces its quantity.
        """
        try:

            if id:

                cart = Cart.objects.exclude(cart_status=5).get(
                    id=id,
                )

                cart.delete()
                message = "Item delete from cart"

            return Response(
                {"status": "success", "message": message},
                status=status.HTTP_200_OK,
            )

        except Cart.DoesNotExist:
            return Response(
                {"status": "error", "message": "Item not found in cart"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
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
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")  # Can be null for guest users
            session_id = data.get("session_id")  # For guest users

            # Fetch cart items based on user_id or session_id
            if user_id:
                cart_items = Cart.objects.filter(user_id=user_id).exclude(cart_status=5)
            else:
                cart_items = Cart.objects.filter(session_id=session_id).exclude(cart_status=5)

            # Prepare the response data
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

        except Exception as e:
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
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")  # Can be null for guest users
            session_id = data.get("session_id")  # For guest users
            restaurant_id = data.get("restaurant_id")
            address_id = data.get("address_id")

            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)

            # Fetch cart items
            if user_id:
                cart_items = Cart.objects.filter(user_id=user_id, restaurant_id=restaurant_id).exclude(cart_status=5)
            else:
                cart_items = Cart.objects.filter(session_id=session_id, restaurant_id=restaurant_id).exclude(cart_status=5)

            cart_details = []
            subtotal = 0

            for item in cart_items:
                restaurant_menu = RestaurantMenu.objects.filter(id=item.item_id).first()
                item_total_price = float(item.item_price)
                subtotal += item_total_price
                
                cart_details.append({
                    "item_id": item.item_id,
                    "id": item.id,
                    "restaurant_id": item.restaurant_id,
                    "item_name": item.item.item_name,
                    "item_description": item.description,
                    "discount_active": item.discount_active,
                    "type": restaurant_menu.food_type if restaurant_menu else None,
                    "discount_percent": item.discount_percent,
                    "item_price": float(item.item_price),
                    "original_item_price": float(restaurant_menu.item_price * item.quantity) if restaurant_menu else 0,
                    "buy_one_get_one_free": item.buy_one_get_one_free,
                    "quantity": item.quantity,
                    "item_image": request.build_absolute_uri(item.item.item_image.url) if item.item.item_image else None,
                })

            # Fetch suggestion items (from same restaurant, excluding already in cart)
            cart_item_ids = [item.item_id for item in cart_items]

            suggestion_items_qs = RestaurantMenu.objects.filter(
                restaurant_id=restaurant_id
            ).exclude(id__in=cart_item_ids)[:5]

            suggestion_cart_items = []

            for item in suggestion_items_qs:
                original_price = float(item.item_price)
                discount_percent = float(item.discount_percent or 0)  # convert to float safely

                # Apply discount logic
                if discount_percent > 0:
                    discounted_price = original_price - (original_price * (discount_percent / 100))
                else:
                    discounted_price = original_price

                suggestion_cart_items.append({
                    "item_name": item.item_name,
                    "item_description": item.description,
                    "discount_active": item.discount_active,
                    "discount_percent": discount_percent,
                    "item_id": item.id,
                    "original_item_price": original_price,
                    "buy_one_get_one_free": item.buy_one_get_one_free,
                    "quantity": 1,
                    "item_price": round(discounted_price, 2),  # final discounted price
                    "type": item.food_type,
                    "item_image": request.build_absolute_uri(item.item_image.url) if item.item_image else None
                })

            # Get delivery address dynamically from UserDeliveryAddress table
            delivery_address_details = {}
            delivery_amount = 0
            distance_km = 0
            if address_id:

                try:
                    if user_id:
                        address_obj = UserDeliveryAddress.objects.get(id=address_id, user_id=user_id)
                    else:
                        # Optional: if guest, address lookup can be skipped or handled differently
                        address_obj = UserDeliveryAddress.objects.get(id=address_id)
                    
                    # Compose single address line (you can customize the format)
                    address_line = f"{address_obj.street_address}, "
                    if address_obj.near_by_landmark:
                        address_line += f"Near {address_obj.near_by_landmark}, "
                    address_line += f"{address_obj.city}, {address_obj.state} - {address_obj.zip_code}, {address_obj.country}"
                    
                    delivery_address_details = {
                        "id": address_obj.id,
                        "address": address_line,
                        "home_type": address_obj.home_type,
                        "name_of_location": address_obj.name_of_location,
                        "latitude": float(address_obj.latitude) if address_obj.latitude else None,
                        "longitude": float(address_obj.longitude) if address_obj.longitude else None,
                    }

                    location_data = calculate_distance_and_cost(restaurant_id, address_id)
                    if "error" in location_data:
                        return self._error_response(location_data["error"], status.HTTP_400_BAD_REQUEST)
                    
                    delivery_amount = location_data["estimated_delivery_cost"]
                    distance_km = location_data["distance_km"]
                    
                except UserDeliveryAddress.DoesNotExist:
                    delivery_address_details = {
                        "error": "Address not found"
                    }
            else:
                # If no address_id provided, you can send empty or default value
                delivery_address_details = {
                    "address": None
                }


            # Static delivery time (you can update as needed)
            delivery_time = {
                "estimated_time": "30-45 mins",
                "is_express_available": True
            }

            tax = 0
            total = subtotal + delivery_amount + tax

            billing_details = {
                "subtotal": round(subtotal),
                "delivery_amount": delivery_amount,
                "distance_km": distance_km,
                "tax": tax,
                "total": round(total),
                "currency": "INR"
            }

            response_data = {
                "status": "success",
                "restaurant_name": restaurant.restaurant_name,
                "cart_details": cart_details,
                "suggestion_cart_items": suggestion_cart_items,
                "delivery_address_details": delivery_address_details,
                "delivery_time": delivery_time,
                "billing_details": billing_details
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except RestaurantMaster.DoesNotExist:
            return Response({"status": "error", "message": "Restaurant not found"}, status=404)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)        
@method_decorator(csrf_exempt, name='dispatch')
class CartWithRestaurantDetailsClear(APIView):
    """
    Clears all cart details for a given session_id or user_id.
    """

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            session_id = data.get("session_id")

            if not user_id and not session_id:
                return Response({"status": "error", "message": "user_id or session_id required"}, status=400)

            # Delete cart items based on user_id or session_id
            if user_id:
                deleted_count, _ = Cart.objects.filter(user_id=user_id).exclude(cart_status=5).delete()
            else:
                deleted_count, _ = Cart.objects.filter(session_id=session_id).exclude(cart_status=5).delete()

            return Response({
                "status": "success",
                "message": f"Deleted {deleted_count} items from cart"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e),
            }, status=status.HTTP_400_BAD_REQUEST)



class UserDeliveryAddressCreateView(generics.CreateAPIView):
    """API to create a new delivery address."""
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)  # Assign the logged-in user

class UserDeliveryAddressUpdateView(generics.RetrieveUpdateAPIView):
    """API to update an existing address."""
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDeliveryAddress.objects.filter(user=self.request.user)
    
class UserDeliveryAddressDeleteView(generics.DestroyAPIView):
    """API to delete an existing user address."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDeliveryAddress.objects.filter(user=self.request.user)

class SetDefaultAddressView(generics.UpdateAPIView):
    """API to set or unset an address as the default for the user."""
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        address_id = kwargs.get('pk')
        user = request.user
        is_default = request.data.get('is_default', False)

        try:
            address = UserDeliveryAddress.objects.get(pk=address_id, user=user)
        except UserDeliveryAddress.DoesNotExist:
            return Response({"detail": "Address not found."}, status=status.HTTP_404_NOT_FOUND)

        if is_default:
            # Set all other addresses to is_default=False
            UserDeliveryAddress.objects.filter(user=user).update(is_default=False)
            # Set selected address to is_default=True
            address.is_default = True
            address.save()
            return Response({"detail": "Default address updated successfully."}, status=status.HTTP_200_OK)
        else:
            # Only unset if this address is currently default
            if address.is_default:
                address.is_default = False
                address.save()
                return Response({"detail": "Address unset as default."}, status=status.HTTP_200_OK)
            return Response({"detail": "No changes made."}, status=status.HTTP_200_OK)
    
class UserDeliveryAddressListCreateView(generics.ListCreateAPIView):
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return only addresses that belong to the authenticated user."""
        return UserDeliveryAddress.objects.filter(user=self.request.user).order_by('-id')

    def perform_create(self, serializer):
        """Assign user to the address before saving."""
        serializer.save(user=self.request.user)

# ✅ Retrieve, Update & Delete Address
class UserDeliveryAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Ensure users can only access their own addresses."""
        return UserDeliveryAddress.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        """Ensure only user's address is updated."""
        serializer.save(user=self.request.user)

@method_decorator(csrf_exempt, name='dispatch')
class CartWithRestaurantUserUpdate(APIView):
    """
    Merges guest cart (session_id) with logged-in user's cart (user_id).
    1. First checks if user has any active cart items
    2. Only deletes existing items if they're from a different session
    3. Preserves cart items when merging empty guest cart
    """

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests to merge guest cart with logged-in user's cart.
        """
        try:

            user_id = request.data.get("user_id")
            session_id = request.data.get("session_id")
            cart_status = request.data.get("cart_status")
            restaurant_id = request.data.get("restaurant_id")

            if not user_id or not session_id:
                return Response(
                    {"status": "error", "message": "user_id and session_id are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                guest_cart_items = Cart.objects.filter(session_id=session_id)
                                
                if guest_cart_items.exists():
                    Cart.objects.filter(
                        Q(user_id=user_id) & 
                        ~Q(cart_status=5) &
                        ~Q(session_id=session_id) &
                        ~Q(restaurant_id=restaurant_id)
                    ).delete()

                updated_count = Cart.objects.filter(
                    session_id=session_id
                ).update(
                    user_id=user_id,
                    cart_status=cart_status,
                    session_id=None
                )

                return Response(
                    {
                        "status": "success",
                        "message": f"Cart merged successfully. {updated_count} items updated.",
                        "updated_count": updated_count
                    },
                    status=status.HTTP_200_OK,
                )

        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
@method_decorator(csrf_exempt, name='dispatch')
class RestaurantOrderDetailsAPI(APIView):
    """
    Optimized POST-only API for restaurant order details
    Requires JSON payload: {"restaurant_id": "BIZ23154878", "user_id": 1, "delivery_address_id": 12}
    """
    
    REQUIRED_FIELDS = {'restaurant_id', 'user_id', 'delivery_address_id'}
    
    def post(self, request, *args, **kwargs):
        try:
            # Validate required fields first
            missing_fields = self.REQUIRED_FIELDS - set(request.data.keys())
            if missing_fields:
                return self._error_response(
                    f"Missing required fields: {', '.join(missing_fields)}",
                    status.HTTP_400_BAD_REQUEST
                )
            
            restaurant_id = request.data['restaurant_id']
            user_id = request.data['user_id']
            delivery_address_id = request.data['delivery_address_id']

            # Fetch restaurant with single query
            restaurant = self._get_restaurant_with_location(restaurant_id)
            if not restaurant:
                return self._error_response("Restaurant not found", status.HTTP_404_NOT_FOUND)

            # Get cart items in one query
            cart_items = self._get_user_cart_items(user_id, restaurant_id)
            
            # Calculate distance and cost
            location_data = calculate_distance_and_cost(restaurant_id, delivery_address_id)
            if "error" in location_data:
                return self._error_response(location_data["error"], status.HTTP_400_BAD_REQUEST)

            # Build response data
            response_data = {
                "status": "success",
                "restaurant_details": self._build_restaurant_details(restaurant),
                "restaurant_coordinates": location_data["restaurant_coordinates"],
                "user_coordinates": location_data["user_coordinates"],
                "distance_km": location_data["distance_km"],
                "estimated_delivery_cost": location_data["estimated_delivery_cost"],
                "order_summary": self._build_order_summary(cart_items)
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self._error_response(
                "An error occurred while processing your request",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_detail=str(e)
            )

    def _get_restaurant_with_location(self, restaurant_id):
        """Fetch restaurant with location in a single query"""
        return (RestaurantMaster.objects
                .filter(restaurant_id=restaurant_id)
                .select_related('restaurant_location')
                .first())

    def _get_user_cart_items(self, user_id, restaurant_id):
        """Fetch user cart items with optimized query"""
        return (Cart.objects
                .filter(user_id=user_id, restaurant_id=restaurant_id)
                .exclude(cart_status=5)
                .select_related('item')
                .only('quantity', 'item__id', 'item__item_name', 'item__item_price'))

    def _build_restaurant_details(self, restaurant):
        """Construct restaurant details with formatted address using list comprehension"""
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
        """Calculate and construct order summary with list comprehension"""
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
        """Helper for consistent error responses"""
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

                # Validate input data
                serializer = OrderPlacementSerializer(data=request.data)
                if not serializer.is_valid():
                    logger.error("OrderPlacementSerializer errors: %s", serializer.errors)
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

                data = serializer.validated_data
                logger.info("Validated input data: %s", data)

                # Get user's cart items
                cart_items = Cart.objects.filter(
                    user_id=data['user_id'],
                    restaurant_id=data['restaurant_id'],
                    cart_status__in=[1, 2, 3, 4]
                ).select_related('item')

                if not cart_items.exists():
                    logger.warning("No cart items found for user %s", data['user_id'])
                    return Response(
                        {"status": "error", "message": "No items in cart to order"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Coupon validation
                coupon_id = None
                if data.get('code'):
                    try:
                        coupon = Coupon.objects.get(code=data['code'])
                        coupon_id = coupon.id
                        logger.info("Coupon applied: %s (ID: %s)", data['code'], coupon.id)
                    except Coupon.DoesNotExist:
                        logger.warning("Invalid coupon code provided: %s", data['code'])

                # Calculate totals
                subtotal = sum(item.item_price for item in cart_items)
                tax = subtotal * Decimal('0.00')
                delivery_fee = data['delivery_fee']
                total = data['total_amount']

                logger.info(
                    "Order totals calculated: subtotal=%s, tax=%s, delivery_fee=%s, total=%s",
                    subtotal, tax, delivery_fee, total
                )

                # Create order
                current_time = datetime.now()
                future_time = current_time + timedelta(minutes=45)

                order = Order.objects.create(
                    coupon_id=coupon_id,
                    coupon_discount=data['discount_amount'],
                    user_id=data['user_id'],
                    restaurant_id=data['restaurant_id'],
                    order_number=self._generate_order_number(),
                    status=1,
                    payment_status=data['payment_status'],
                    payment_method=data['payment_method'],
                    payment_type=data['payment_type'],
                    subtotal=subtotal,
                    delivery_fee=delivery_fee,
                    tax=tax,
                    delivery_date=future_time,
                    quantity=1,
                    total_amount=total,
                    delivery_address_id=data['delivery_address_id'],
                    special_instructions=data.get('special_instructions'),
                    is_takeaway=data['is_takeaway'],
                    preparation_time=self._estimate_prep_time(cart_items)
                )

                logger.info("Order created successfully: OrderID=%s, OrderNo=%s",
                            order.id, order.order_number)

                # Create initial order log
                OrderStatusLog.objects.create(
                    order=order,
                    status=1,
                    notes="Order placed successfully"
                )

                logger.info("OrderStatusLog created for OrderNo=%s", order.order_number)

                # Update cart items
                Cart.objects.filter(
                    Q(user_id=data['user_id']) &
                    ~Q(cart_status=5) &
                    (Q(order_number__isnull=True) | Q(order_number__exact=''))
                ).update(
                    cart_status=5,
                    order_number=order.order_number
                )

                logger.info("Cart updated for user %s", data['user_id'])

                # Send email
                send_order_status_email(order)
                logger.info("Order email sent for OrderNo=%s", order.order_number)

                response_data = {
                    "status": "success",
                    "order_number": order.order_number,
                    "order_id": order.id,
                    "total_amount": str(order.total_amount),
                    "estimated_prep_time": order.preparation_time,
                }

                return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception("Error while placing order: %s", e)
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_order_number(self):
        from django.utils.timezone import now, timedelta
        """Generate unique order number"""
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
        logger.info("Generated order number: %s", order_no)
        return order_no

    def _estimate_prep_time(self, cart_items):
        """Estimate preparation time based on items"""
        base_time = 15
        item_time = sum(item.item.preparation_time * item.quantity for item in cart_items)
        prep_time = min(base_time + item_time, 120)

        logger.info("Estimated preparation time: %s minutes", prep_time)
        return prep_time
    
# class GetAddressByFilter(APIView):
#     permission_classes = [permissions.IsAuthenticated]

#     def post(self, request):
#         try:
#             lat = request.data.get("lat")
#             long = request.data.get("long")

#             if not lat or not long:
#                 return Response({"detail": "Latitude and Longitude are required"}, status=status.HTTP_400_BAD_REQUEST)

#             latitude = Decimal(lat)
#             longitude = Decimal(long)

#             address = UserDeliveryAddress.objects.filter(
#                 user=request.user,
#                 latitude=latitude,
#                 longitude=longitude
#             ).first()

#             if address:
#                 serializer = UserDeliveryAddressSerializer(address)
#                 data = serializer.data

#                 # Override home_type if it is "Other"
#                 if address.home_type == "Other" and address.name_of_location:
#                     data["home_type"] = address.name_of_location

#                 return Response(data, status=status.HTTP_200_OK)
#             else:
#                 return Response({"detail": "Address not found"}, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
class GetAddressByFilter(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            lat = request.data.get("lat")
            long = request.data.get("long")

            if not lat or not long:
                return Response(
                    {"detail": "Latitude and Longitude are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            latitude = Decimal(lat)
            longitude = Decimal(long)

            # Check if address exists in DB
            address = UserDeliveryAddress.objects.filter(
                user=request.user,
                latitude=latitude,
                longitude=longitude
            ).first()

            if address:
                serializer = UserDeliveryAddressSerializer(address)
                data = serializer.data

                if address.home_type == "Other" and address.name_of_location:
                    data["home_type"] = address.name_of_location

                return Response(data, status=status.HTTP_200_OK)

            else:

                GOOGLE_API_KEY = settings.GOOGLE_MAP_API_KEY
                url = (
                    f"https://maps.googleapis.com/maps/api/geocode/json"
                    f"?latlng={latitude},{longitude}&key={GOOGLE_API_KEY}"
                )

                response = requests.get(url)
                if response.status_code == 200:
                    results = response.json().get("results")
                    if results:
                        full_address = results[0].get("formatted_address")
                        return Response(
                            {"detail": "Address not found in DB", "full_address": full_address},
                            status=status.HTTP_200_OK
                        )

                return Response(
                    {"detail": "Address not found and unable to fetch from Google"},
                    status=status.HTTP_200_OK
                )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
@method_decorator(csrf_exempt, name='dispatch')
class RestaurantCartReOrder(APIView):
    """
    API endpoint to reorder items from a previous order.
    - Requires user to be logged in.
    - Clears the user's current cart before adding reordered items.
    """

    def post(self, request, order_number, *args, **kwargs):
        try:

            if not request.user.is_authenticated:
                return Response({
                    "status": "error",
                    "message": "Authentication required. Please log in."
                }, status=status.HTTP_401_UNAUTHORIZED)

            user = request.user

            Cart.objects.filter(user=user).exclude(cart_status=5).delete()

            order_items = Cart.objects.filter(order_number=order_number)

            if not order_items.exists():
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

            return Response({
                "status": "success",
                "message": "Items from previous order added to cart successfully."
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class userDataDelete(APIView):
    print("====")