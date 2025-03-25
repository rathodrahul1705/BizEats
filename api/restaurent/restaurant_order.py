from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.models import Cart, RestaurantMenu, User
import json
from django.db import transaction
from django.db.models import Q 
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments, RestaurantOwnerDetail, RestaurantLocation, RestaurantMenu, UserDeliveryAddress
from api.serializers import RestaurantMasterSerializer, RestaurantSerializerByStatus, RestaurantDetailSerializer, RestaurantMasterNewSerializer, RestaurantMenuSerializer, RestaurantListSerializer, UserDeliveryAddressSerializer

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

            # Validate required fields
            if not all([action, restaurant_id, item_id]):
                return Response(
                    {"status": "error", "message": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Call the appropriate method based on the action
            if action == "add":
                return self._add_to_cart(user_id, session_id, restaurant_id, item_id, quantity)
            elif action == "remove":
                return self._remove_from_cart(user_id, session_id, restaurant_id, item_id)
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
        
    def _add_to_cart(self, user_id, session_id, restaurant_id, item_id, quantity):
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

            # Check if the item already exists in the cart
            cart = Cart.objects.filter(
                user_id=user_id,
                restaurant_id=restaurant_id,
                item_id=item_id,
            ).exclude(cart_status=5).first()

            if cart:
                # If the item exists, update the quantity
                cart.quantity += quantity
                cart.save()
                message = "Item quantity updated in cart"
            else:
                # If the item does not exist, create a new entry
                Cart.objects.create(
                    user_id=user_id,
                    session_id=session_id,
                    restaurant_id=restaurant_id,
                    item_id=item_id,
                    quantity=quantity,
                )
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
            # Get the cart item
            cart = Cart.objects.exclude(cart_status=5).get(
                user_id=user_id,
                restaurant_id=restaurant_id,
                item_id=item_id,
            )

            # Reduce quantity or delete the item
            if cart.quantity > 1:
                cart.quantity -= 1
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
            for item in cart_items:
                cart_details.append({
                    "item_id": item.item_id,
                    "item_name": item.item.item_name,
                    "item_price": float(item.item.item_price),
                    "quantity": item.quantity,
                    "item_image": request.build_absolute_uri(item.item.item_image.url) if item.item.item_image else None,
                })

            return Response({
                "status": "success",
                "cart_details": cart_details,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
        

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

            # Fetch cart items based on user_id or session_id
            if user_id:
                cart_items = Cart.objects.filter(user_id=user_id).exclude(cart_status=5)
            else:
                cart_items = Cart.objects.filter(session_id=session_id).exclude(cart_status=5)

            # Prepare the cart details response
            cart_details = []
            for item in cart_items:

                cart_details.append({
                    "item_id": item.item_id,
                    "restaurant_id": item.restaurant_id,
                    "item_name": item.item.item_name,
                    "item_description": item.item.description,
                    "item_price": float(item.item.item_price),
                    "quantity": item.quantity,
                    "item_image": request.build_absolute_uri(item.item.item_image.url) if item.item.item_image else None,
                })

            # Fetch restaurant details
            try:

                response_data = {
                    "status": "success",
                    "cart_details": cart_details,
                }

                return Response(response_data, status=status.HTTP_200_OK)

            except RestaurantMaster.DoesNotExist:
                return Response({"status": "error", "message": "Restaurant not found"}, status=404)
            except RestaurantLocation.DoesNotExist:
                return Response({"status": "error", "message": "Restaurant location not found"}, status=404)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
        

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

class UserDeliveryAddressListCreateView(generics.ListCreateAPIView):
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only addresses that belong to the authenticated user."""
        return UserDeliveryAddress.objects.filter(user=self.request.user)

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
                        ~Q(session_id=session_id)
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