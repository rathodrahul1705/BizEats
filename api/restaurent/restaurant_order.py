from datetime import datetime, timedelta
from decimal import Decimal
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.emailer.email_notifications import send_order_status_email
from api.models import Cart, Order, OrderStatusLog, RestaurantMenu, User
import json
from django.db import transaction
from django.db.models import Q 
from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments, RestaurantOwnerDetail, RestaurantLocation, RestaurantMenu, UserDeliveryAddress
from api.serializers import OrderPlacementSerializer, RestaurantMasterSerializer, RestaurantSerializerByStatus, RestaurantDetailSerializer, RestaurantMasterNewSerializer, RestaurantMenuSerializer, RestaurantListSerializer, UserDeliveryAddressSerializer

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
            
            if user_id is None and session_id:

                cart = Cart.objects.filter(
                    restaurant_id=restaurant_id,
                    item_id=item_id,
                    session_id=session_id,
                ).exclude(cart_status=5).first()

                if cart is not None:

                    cart.quantity += quantity
                    cart.user_id = user_id
                    cart.save()
                    message = "Item quantity updated in cart"

                else:

                    Cart.objects.create(
                        user_id=user_id,
                        session_id=session_id,
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
                    cart.save()
                    message = "Item quantity updated in cart"
                    
                else:

                    Cart.objects.create(
                        user_id=user_id,
                        session_id=session_id,
                        restaurant_id=restaurant_id,
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
                    "id": item.id,
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
    Requires JSON payload: {"restaurant_id": "BIZ23154878", "user_id": 1}
    """
    def post(self, request, *args, **kwargs):
        try:
            restaurant_id = request.data.get('restaurant_id')
            user_id = request.data.get('user_id')
            
            if not restaurant_id or not user_id:
                return self._error_response(
                    "Both restaurant_id and user_id are required in JSON payload",
                    status.HTTP_400_BAD_REQUEST
                )

            # Single query to get restaurant with location
            restaurant = (RestaurantMaster.objects
                         .filter(restaurant_id=restaurant_id)
                         .select_related('restaurant_location')
                         .first())
            
            if not restaurant:
                return self._error_response("Restaurant not found", status.HTTP_404_NOT_FOUND)

            # Get cart items in a single optimized query
            cart_items = (Cart.objects
                         .filter(user_id=user_id, restaurant_id=restaurant_id)
                         .exclude(cart_status=5)
                         .select_related('item')
                         .only('quantity', 'item__id', 'item__item_name', 'item__item_price'))

            # Build response data
            response_data = {
                "status": "success",
                "restaurant_details": self._build_restaurant_details(restaurant),
                "order_summary": self._build_order_summary(cart_items)
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self._error_response(
                "An error occurred while processing your request",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                str(e)
            )

    def _build_restaurant_details(self, restaurant):
        """Construct restaurant details with formatted address"""
        location = restaurant.restaurant_location
        address_parts = [
            location.shop_no_building,
            location.floor_tower,
            location.area_sector_locality,
            f"Near {location.nearby_locality}" if location.nearby_locality else None,
            location.city
        ]
        return {
            "restaurant_name": restaurant.restaurant_name,
            "restaurant_address": ", ".join(filter(None, address_parts))
        }

    def _build_order_summary(self, cart_items):
        """Calculate and construct order summary"""
        item_details = []
        total_amount = 0.0
        
        for item in cart_items:
            item_total = float(item.item.item_price) * item.quantity
            item_details.append({
                "item_id": item.item.id,
                "item_name": item.item.item_name,
                "quantity": item.quantity,
                "unit_price": float(item.item.item_price),
                "total_price": round(item_total, 2)
            })
            total_amount += item_total

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
            "message": message
        }
        if error_detail:
            response["error_details"] = error_detail
        return Response(response, status=status_code)
    

@method_decorator(csrf_exempt, name='dispatch')
class PlaceOrderAPI(APIView):
    """
    API to place an order from cart items
    Required POST data:
    {
        "user_id": 1,
        "restaurant_id": "BIZ23154878",
        "payment_method": 3,
        "delivery_address_id": 1,
        "is_takeaway": false,
        "special_instructions": "Less spicy please"
    }
    """

    def post(self, request, *args, **kwargs):
        try:
            with transaction.atomic():
                # Validate input data
                serializer = OrderPlacementSerializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                data = serializer.validated_data

                # Get user's cart items
                cart_items = Cart.objects.filter(
                    user_id=data['user_id'],
                    restaurant_id=data['restaurant_id'],
                    cart_status__in=[1, 2, 3, 4]  # Only non-completed items
                ).select_related('item')

                if not cart_items.exists():
                    return Response(
                        {"status": "error", "message": "No items in cart to order"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Calculate order totals
                subtotal = sum(item.item.item_price * item.quantity for item in cart_items)
                tax = subtotal * Decimal('0.05')  # Example 5% tax
                delivery_fee = Decimal('50.00') if not data['is_takeaway'] else Decimal('0.00')
                total = subtotal + tax + delivery_fee

                # Create order
                current_time = datetime.now()
                future_time = current_time + timedelta(minutes=45)
                order = Order.objects.create(
                    user_id=data['user_id'],
                    restaurant_id=data['restaurant_id'],
                    order_number=self._generate_order_number(),
                    status=1,  # Pending
                    payment_status=1,  # Pending
                    payment_method=data['payment_method'],
                    subtotal=subtotal,
                    tax=tax,
                    delivery_date= future_time,
                    quantity=1,
                    total_amount=total,
                    delivery_address_id=data['delivery_address_id'],
                    special_instructions=data.get('special_instructions'),
                    is_takeaway=data['is_takeaway'],
                    preparation_time=self._estimate_prep_time(cart_items)
                )

                # Create initial status log
                OrderStatusLog.objects.create(
                    order=order,
                    status=1,
                    notes="Order placed successfully"
                )

                Cart.objects.filter(
                    Q(user_id=data['user_id']) &
                    ~Q(cart_status=5) &
                    (Q(order_number__isnull=True) | Q(order_number__exact=''))
                ).update(
                    cart_status=5,
                    order_number=order.order_number
                )

                # Send email via common function
                send_order_status_email(order)

                # Prepare response
                response_data = {
                    "status": "success",
                    "order_number": order.order_number,
                    "order_id": order.id,
                    "total_amount": str(order.total_amount),
                    "estimated_prep_time": order.preparation_time,
                }

                return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_order_number(self):
        from django.utils.timezone import now, timedelta

        """Generate unique order number (e.g. ORD20230715-0001)"""
        today_str = now().strftime('%Y%m%d')
        last_order = Order.objects.filter(
            order_number__startswith=f'ORD{today_str}-'
        ).order_by('-order_number').first()
        
        if last_order:
            last_seq = int(last_order.order_number.split('-')[-1])
            new_seq = last_seq + 1
        else:
            new_seq = 1
            
        return f'ORD{today_str}-{new_seq:04d}'

    def _estimate_prep_time(self, cart_items):
        """Estimate preparation time based on items"""
        base_time = 15  # minutes
        item_time = sum(item.item.preparation_time * item.quantity for item in cart_items)
        return min(base_time + item_time, 120)  # Cap at 2 hours