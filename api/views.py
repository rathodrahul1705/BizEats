from datetime import timedelta
import random
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from api import serializers
from api.emailer.email_notifications import generate_coupon_html, generate_coupon_status_html, send_otp_email, send_contact_email
from api.mobile.auth import send_otp_via_twilio
from api.serializers import ContactUsSerializer, OrderReviewSerializer, RestaurantCategorySerializer
from api.tasks import update_order_statuses
from .models import Cart, ContactMessage, OrderReview, RestaurantCategory, User, RestaurantMaster
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.generic import TemplateView
from django.views.generic import View
from django.shortcuts import render
from django.utils.decorators import method_decorator
import logging
from django.db.models import Avg, Count
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from api.models import OfferDetail
from api.offer.offer_serializers import OfferSerializer
from api.serializers import RestaurantMasterSerializer 
from rest_framework import viewsets, permissions
from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from rest_framework.decorators import action


logger = logging.getLogger(__name__)

class ReactAppView(View):
    def get(self, request):
        logger.info("Rendering React app index.html")
        return render(request, "index.html")

class UserRegistrationView(APIView):
    def post(self, request, *args, **kwargs):
        logger.info("User registration request received")
        email = request.data.get("email")
        full_name = request.data.get("full_name")
        contact_number = request.data.get("contact_number")
        
        # Validate inputs
        if not email or not full_name:
            logger.warning(f"Registration failed: Missing required fields. Email: {email}, Full Name: {full_name}")
            return Response({"error": "Email and full_name are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Create the user with provided email and full_name (contact_number is optional)
            user = User.objects.create_user(email=email, full_name=full_name, contact_number=contact_number)
            logger.info(f"User registered successfully: {email}, User ID: {user.id}")

            # Generate OTP and send email
            user.generate_otp()
            send_otp_email(user,'Eatoor Registration Verification Code', otp_type="registration")
            logger.info(f"OTP sent to email for user: {email}")
            
            return Response({"message": "User registered successfully. OTP sent to email."}, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"User registration failed for {email}: {str(e)}", exc_info=True)
            return Response({"error": "Registration failed. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class OTPVerificationView(APIView):
    def post(self, request, *args, **kwargs):
        logger.info("OTP verification request received")
        email = request.data.get("email")
        otp = request.data.get("otp")

        # Check if email and OTP are provided
        if not email or not otp:
            logger.warning(f"OTP verification failed: Missing email or OTP. Email: {email}")
            return Response({"error": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            logger.info(f"User found for OTP verification: {email}")
        except User.DoesNotExist:
            logger.warning(f"OTP verification failed: User not found for email: {email}")
            return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP
        if user.verify_otp(otp):
            logger.info(f"OTP verified successfully for user: {email}")
            # OTP is valid, generate tokens
            refresh = RefreshToken.for_user(user)
            is_restaurant_register = RestaurantMaster.objects.filter(user=user).exists()
            logger.info(f"User {email} logged in. Restaurant registered: {is_restaurant_register}")

            # User details to be returned in the response
            user_data = {
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "contact_number": user.contact_number,
                "role": user.get_role_display(),
                "is_verified": user.user_verified,
                "created_at": user.created_at,
                "updated_at": user.updated_at,
            }
            
            return Response({
                "message": "Login successful",
                "user": user_data,  # Include user details here
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "is_restaurant_register": is_restaurant_register
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"OTP verification failed for user {email}: Invalid or expired OTP")
            return Response({"error": "Invalid OTP or OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")

        logger.info(f"User login request received for email: {email}")

        if not email:
            logger.warning("Login failed: Email not provided")
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            logger.info(f"User found for login: {email}")
        except User.DoesNotExist:
            logger.warning(f"Login failed: User not found for email: {email}")
            return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

        if user:
            user.generate_otp()
            send_otp_email(user,'Eatoor Login Verification Code', otp_type="login")
            logger.info(f"OTP sent to email for login: {email}")
            return Response({
                "message": "OTP sent to email. Please verify.",
            }, status=status.HTTP_200_OK)
        
        logger.warning(f"Login failed: User not verified for email: {email}")
        return Response({"error": "User is not verified."}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]  # Only authenticated users can access this view
    
    def get(self, request, *args, **kwargs):
        # Get the currently authenticated user
        user = request.user
        logger.info(f"User profile accessed by user: {user.email} (ID: {user.id})")
        
        # Prepare user data to send in the response
        user_data = {
            "full_name": user.full_name,
            "email": user.email,
            "contact_number": user.contact_number,
            "role": user.get_role_display(),  # Get human-readable role
            "is_verified": user.user_verified,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }
        
        return Response(user_data, status=status.HTTP_200_OK)

class ContactUsView(APIView):
    def post(self, request, *args, **kwargs):
        logger.info("ContactUs request received")
        serializer = ContactUsSerializer(data=request.data)

        if not serializer.is_valid():
            logger.warning(f"ContactUs validation failed: {serializer.errors}")
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        name = data['name']
        email = data['email']
        message = data['message']

        logger.info(f"New Contact Message: {email} - {name}")

        try:
            # Optional: Save to database
            ContactMessage.objects.create(name=name, email=email, message=message)
            logger.info(f"Contact message saved to database from {email}")

            # Send Email
            send_contact_email(name, email, message)
            logger.info(f"Contact email sent successfully to {email}")

        except Exception as e:
            logger.error(f"Error processing contact message from {email}: {str(e)}", exc_info=True)
            return Response({"error": "Failed to process your request. Please try again."}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": "Thank you for contacting us. We'll get back to you soon!"
        }, status=status.HTTP_200_OK)

class CustomTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Token refresh request received")
        refresh_token = request.data.get('refresh')

        if refresh_token is None:
            logger.warning("Token refresh failed: Refresh token not provided")
            return Response({'detail': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            new_access_token = str(token.access_token)
            logger.info("Token refreshed successfully")
            return Response({
                'access': new_access_token
            })

        except TokenError as e:
            logger.warning(f"Token refresh failed: {str(e)}")
            return Response({
                'detail': 'Token is invalid or expired',
                'error': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)
        

class UserProfileUpdate(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        logger.info(f"Profile update requested for user: {user.email} (ID: {user.id})")
        
        email = request.data.get('email')
        contact_number = request.data.get('contact_number')

        try:
            if email:
                user.email = email
                logger.info(f"Email updated to: {email}")
            if contact_number:
                user.contact_number = contact_number
                logger.info(f"Contact number updated to: {contact_number}")

            user.save()
            logger.info(f"Profile updated successfully for user: {user.email}")

        except Exception as e:
            logger.error(f"Profile update failed for user {user.email}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to update profile. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'contact_number': user.contact_number
            }
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class SubmitOrderReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info(f"Order review submission by user: {request.user.email}")
        data = request.data.copy()
        data['user'] = request.user.id
        serializer = OrderReviewSerializer(data=data)
        
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Order review submitted successfully by user {request.user.email}")
            return Response({"message": "Review submitted successfully", "data": serializer.data, "status":"success"}, status=status.HTTP_201_CREATED)
        
        logger.warning(f"Order review submission failed by user {request.user.email}: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FetchReviewView(APIView):
    def get(self, request, *args, **kwargs):
        logger.info("Fetching reviews request received")
        
        try:
            # Get the latest review with non-empty text
            first_review_with_text = OrderReview.objects.filter(
                review_text__isnull=False
            ).exclude(
                review_text__exact=''
            ).order_by('-created_at').first()

            # Get all other reviews
            other_reviews = OrderReview.objects.exclude(
                id=first_review_with_text.id if first_review_with_text else None
            ).order_by('-created_at')

            # Combine reviews
            combined_reviews = [first_review_with_text] if first_review_with_text else []
            combined_reviews += list(other_reviews)

            # Serialize reviews
            reviews_data = [
                {
                    "id": review.id,
                    "rating": review.rating,
                    "user_id": review.user_id,
                    "name": review.user.full_name,
                    "comment": review.review_text,
                    "created_at": review.created_at,
                    "updated_at": review.updated_at,
                }
                for review in combined_reviews if review is not None
            ]

            # Calculate count and average rating
            review_stats = OrderReview.objects.aggregate(
                total_reviews=Count('id'),
                avg_rating=Avg('rating')
            )

            logger.info(f"Reviews fetched successfully. Total: {review_stats['total_reviews']}, Avg rating: {review_stats['avg_rating']}")
            
            return Response(
                {
                    "rating_ratio": round(review_stats['avg_rating'] or 0, 1),
                    "total_reviews": review_stats['total_reviews'],
                    "reviews": reviews_data
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error fetching reviews: {str(e)}", exc_info=True)
            return Response({"error": "Failed to fetch reviews"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FetchUserList(APIView):
    def get(self, request, *args, **kwargs):
        logger.info("Fetching user list request received")
        
        try:
            users = User.objects.all().order_by('-id').values('id', 'email', 'full_name', 'contact_number', 'is_active')
            user_count = users.count()
            logger.info(f"User list fetched successfully. Total users: {user_count}")
            return Response({"users": list(users)}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching user list: {str(e)}", exc_info=True)
            return Response({"error": "Failed to fetch users"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FetchCartList(APIView):
    def get(self, request, *args, **kwargs):
        logger.info("Fetching cart list request received")
        
        try:
            carts = Cart.objects.select_related('user', 'restaurant', 'item').order_by('-created_at')
            cart_data = []

            for cart in carts:
                cart_data.append({
                    "user": {
                        "id": cart.user.id if cart.user else None,
                        "name": cart.user.full_name if cart.user else "Guest",
                        "email": cart.user.email if cart.user else None,
                    },
                    "restaurant": {
                        "id": cart.restaurant.restaurant_id,
                        "name": cart.restaurant.restaurant_name
                    },
                    "item": {
                        "id": cart.item.id,
                        "session_id": cart.session_id,
                        "name": cart.item.item_name,
                        "price": str(cart.item_price) if cart.item_price else None,
                        "description": cart.description
                    },
                    "quantity": cart.quantity,
                    "cart_status": dict(Cart.CART_STATUS_CHOICES).get(cart.cart_status, "Unknown"),
                    "order_number": cart.order_number,
                    "buy_one_get_one_free": cart.buy_one_get_one_free,
                    "created_at": cart.created_at,
                    "updated_at": cart.updated_at
                })

            logger.info(f"Cart list fetched successfully. Total carts: {len(cart_data)}")
            return Response({"carts": cart_data}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching cart list: {str(e)}", exc_info=True)
            return Response({"error": "Failed to fetch carts"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RestaurantCategoryViewSet(viewsets.ModelViewSet):
    queryset = RestaurantCategory.objects.all()
    serializer_class = RestaurantCategorySerializer

    def get_queryset(self):
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            logger.info(f"Fetching categories for restaurant_id: {restaurant_id}")
            return self.queryset.filter(restaurant_id=restaurant_id)
        logger.info("Fetching all restaurant categories")
        return self.queryset    

class OfferViewSet(viewsets.ModelViewSet):
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        code = self.request.query_params.get("code")
        source = self.request.query_params.get("source")

        logger.info(
            f"Offer queryset request from user: {user.email} "
            f"source: {source} | code: {code} "
            f"(Role: {getattr(user, 'role', 'N/A')})"
        )

        # Base queryset
        queryset = OfferDetail.objects.all().order_by("-created_at")

        # Filter by code
        if code:
            queryset = queryset.filter(code=code)

        # ADMIN: show all offers
        if getattr(user, "role", None) == 2:
            return queryset

        # Non-admin:
        # source=web -> include marketing coupons
        # source != web -> exclude marketing coupons
        if source != "web":
            queryset = queryset.filter(is_marketing_coupon=False)

        # Get restaurant IDs
        restaurant_ids = []

        if hasattr(user, "restaurants"):
            restaurant_ids = list(
                user.restaurants.values_list("restaurant_id", flat=True)
            )

        logger.info(
            f"User {user.email} restaurant IDs: {restaurant_ids}"
        )

        # Apply restaurant filter ONLY if restaurant IDs exist
        if restaurant_ids:
            queryset = queryset.filter(
                restaurant_id__in=restaurant_ids
            )

            logger.info(
                f"Filtering offers by restaurants: {restaurant_ids}"
            )
        else:
            logger.info(
                f"No restaurant IDs for {user.email}, "
                f"skipping restaurant filter"
            )

        return queryset

    def get_object(self):
        """
        Override get_object to bypass queryset filtering for detail/update/delete operations.
        This allows app users to update/delete marketing coupons even though they're filtered out in list view.
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        
        logger.info(f"Getting offer with pk: {pk}")
        
        # Get the object directly from database
        try:
            obj = OfferDetail.objects.get(pk=pk)
            logger.info(f"Offer found: {obj.code if obj else 'None'}")
        except OfferDetail.DoesNotExist:
            logger.warning(f"Offer not found with pk: {pk}")
            from rest_framework.exceptions import NotFound
            raise NotFound('Offer not found')
        
        # Check if user has permission to access this object
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        user = self.request.user
        restaurant_id = self.request.data.get('restaurant')
        query_restaurant_id = self.request.query_params.get('restaurant_id')

        logger.info(f"Creating offer by user: {user.email}")

        # ✅ ADMIN CAN CREATE ANY OFFER OR GLOBAL OFFER
        if hasattr(user, 'role') and user.role == 2:
            logger.info(f"Admin user {user.email} creating offer")
            if restaurant_id:
                try:
                    restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)
                    serializer.validated_data['restaurant'] = restaurant
                    logger.info(f"Offer assigned to restaurant_id: {restaurant_id}")
                except RestaurantMaster.DoesNotExist:
                    logger.warning(f"Restaurant not found with id: {restaurant_id}")
                    serializer.validated_data['restaurant'] = None
            else:
                serializer.validated_data['restaurant'] = None

        else:
            # NON-ADMIN MUST CREATE ONLY IN THEIR RESTAURANT
            logger.info(f"Non-admin user {user.email} creating offer")
            if restaurant_id:
                user_restaurants = getattr(user, "restaurants", [])
                if user_restaurants and user_restaurants.filter(restaurant_id=restaurant_id).exists():
                    restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)
                    serializer.validated_data['restaurant'] = restaurant
                    logger.info(f"Offer assigned to user's restaurant: {restaurant_id}")
                else:
                    logger.warning(f"User {user.email} does not have permission for restaurant: {restaurant_id}")
                    raise serializers.ValidationError({'restaurant': 'You do not have permission for this restaurant'})

            elif query_restaurant_id:
                try:
                    restaurant = RestaurantMaster.objects.get(restaurant_id=query_restaurant_id)
                    serializer.validated_data['restaurant'] = restaurant
                    logger.info(f"Offer assigned to restaurant from query param: {query_restaurant_id}")
                except RestaurantMaster.DoesNotExist:
                    logger.warning(f"Restaurant not found with id: {query_restaurant_id}")
                    raise serializers.ValidationError({'restaurant': 'Restaurant not found'})

            else:
                if hasattr(user, 'restaurants') and user.restaurants.exists():
                    restaurant = user.restaurants.first()
                    serializer.validated_data['restaurant'] = restaurant
                    logger.info(f"Offer assigned to user's first restaurant: {restaurant.restaurant_id if restaurant else 'None'}")
                else:
                    logger.warning(f"No restaurant associated with user: {user.email}")
                    raise serializers.ValidationError({'restaurant': 'No restaurant associated with your account'})

        instance = serializer.save()

        # Send email only for coupon_code type
        if instance.offer_type == 'coupon_code' and instance.code:
            logger.info(f"Sending coupon email for offer code: {instance.code}")
            self.send_coupon_email(instance)

    def update(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()  # This now uses the overridden get_object
        prev_status = instance.is_active

        logger.info(f"Updating offer {instance.code} by user: {user.email}")

        # Permission check for non-admin
        if not (hasattr(user, 'role') and user.role == 2):
            if instance.restaurant:
                user_restaurants = getattr(user, "restaurants", [])
                if not user_restaurants.filter(restaurant_id=instance.restaurant.restaurant_id).exists():
                    logger.warning(f"User {user.email} does not have permission to update offer: {instance.code}")
                    return Response(
                        {'error': 'You do not have permission to update this offer.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        new_status = updated_instance.is_active

        # Send status update email
        if (
            prev_status != new_status and
            updated_instance.offer_type == 'coupon_code' and
            new_status in [OfferDetail.INACTIVE, OfferDetail.APPROVED]
        ):
            logger.info(f"Offer status changed from {prev_status} to {new_status}. Sending status update email.")
            self.send_coupon_status_update_email(updated_instance)

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()  # This now uses the overridden get_object

        logger.info(f"Deleting offer {instance.code} by user: {user.email}")

        if not (hasattr(user, 'role') and user.role == 2):
            if instance.restaurant:
                user_restaurants = getattr(user, "restaurants", [])
                if not user_restaurants.filter(restaurant_id=instance.restaurant.restaurant_id).exists():
                    logger.warning(f"User {user.email} does not have permission to delete offer: {instance.code}")
                    return Response(
                        {'error': 'You do not have permission to delete this offer.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

        logger.info(f"Offer {instance.code} deleted successfully by user: {user.email}")
        return super().destroy(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to use the overridden get_object"""
        logger.info(f"Retrieving offer details by user: {request.user.email}")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def global_offers(self, request):
        logger.info(f"Fetching global offers by user: {request.user.email}")
        queryset = OfferDetail.objects.filter(restaurant__isnull=True)
        serializer = self.get_serializer(queryset, many=True)
        logger.info(f"Returning {queryset.count()} global offers")
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def restaurant_offers(self, request):
        restaurant_id = request.query_params.get('restaurant_id')
        logger.info(f"Fetching restaurant offers for restaurant_id: {restaurant_id} by user: {request.user.email}")
        
        if not restaurant_id:
            logger.warning("restaurant_id parameter is required but not provided")
            return Response({'error': 'restaurant_id parameter is required'}, status=400)

        queryset = OfferDetail.objects.filter(restaurant_id=restaurant_id)
        serializer = self.get_serializer(queryset, many=True)
        logger.info(f"Returning {queryset.count()} offers for restaurant {restaurant_id}")
        return Response(serializer.data)

    # EMAIL METHODS
    def send_coupon_email(self, coupon):
        logger.info(f"Sending coupon email for code: {coupon.code}")
        try:
            vendor_html = self.generate_coupon_html(coupon, is_vendor=True)
            vendor_recipient_list = []
            if coupon.restaurant and coupon.restaurant.owner_details:
                vendor_email = getattr(coupon.restaurant.owner_details, "owner_email_address", None)
                if vendor_email:
                    vendor_recipient_list.append(vendor_email)

            if vendor_recipient_list:
                logger.info(f"Sending vendor email to: {vendor_recipient_list}")
                send_mail(
                    subject=f"Your coupon {coupon.code} is pending approval",
                    message=strip_tags(vendor_html),
                    html_message=vendor_html,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=vendor_recipient_list,
                    fail_silently=False,
                )
                logger.info(f"Vendor email sent for coupon: {coupon.code}")
            else:
                logger.warning(f"No vendor email found for coupon: {coupon.code}")

            User = get_user_model()
            admin_emails = User.objects.filter(role=2).values_list('email', flat=True)
            admin_recipients = list(filter(None, admin_emails))

            if admin_recipients:
                logger.info(f"Sending admin email to: {admin_recipients}")
                admin_html = self.generate_coupon_html(coupon, is_vendor=False)
                send_mail(
                    subject=f"Approval needed for coupon {coupon.code}",
                    message=strip_tags(admin_html),
                    html_message=admin_html,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_recipients,
                    fail_silently=False,
                )
                logger.info(f"Admin email sent for coupon: {coupon.code}")
            else:
                logger.warning(f"No admin emails found for coupon: {coupon.code}")
                
        except Exception as e:
            logger.error(f"Error sending coupon email for {coupon.code}: {str(e)}", exc_info=True)

    def send_coupon_status_update_email(self, coupon):
        logger.info(f"Sending coupon status update email for code: {coupon.code}")
        try:
            if not coupon.restaurant or not coupon.restaurant.owner_details:
                logger.warning(f"No restaurant or owner details found for coupon: {coupon.code}")
                return

            vendor_email = getattr(coupon.restaurant.owner_details, "owner_email_address", None)
            if not vendor_email:
                logger.warning(f"No vendor email found for coupon: {coupon.code}")
                return

            status_text = "approved" if coupon.is_active == OfferDetail.APPROVED else "rejected"
            subject = f"Your coupon {coupon.code} has been {status_text}"
            body_html = self.generate_coupon_status_html(coupon)

            logger.info(f"Sending status update email to: {vendor_email}")
            send_mail(
                subject=subject,
                message=strip_tags(body_html),
                html_message=body_html,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[vendor_email],
                fail_silently=False,
            )
            logger.info(f"Status update email sent for coupon: {coupon.code}")
            
        except Exception as e:
            logger.error(f"Error sending status update email for {coupon.code}: {str(e)}", exc_info=True)

    def generate_coupon_html(self, coupon, is_vendor=True):
        status_display = coupon.get_is_active_display()
        restaurant_name = coupon.restaurant.restaurant_name if coupon.restaurant else "Global Offer"

        if is_vendor:
            return f"""
            <html>
            <body>
                <h2>Coupon Created Successfully!</h2>
                <p>Your coupon has been created and is pending approval.</p>
                <div style="background:#f8f9fa;padding:20px;border-radius:5px">
                    <p><strong>Code:</strong> {coupon.code}</p>
                    <p><strong>Status:</strong> {status_display}</p>
                    <p><strong>Restaurant:</strong> {restaurant_name}</p>
                    <p><strong>Discount:</strong> {coupon.discount_value}{'%' if coupon.discount_type == 'percentage' else '₹'}</p>
                </div>
            </body>
            </html>
            """

        else:
            return f"""
            <html>
            <body>
                <h2>Coupon Approval Required</h2>
                <div style="background:#f8f9fa;padding:20px;border-radius:5px">
                    <p><strong>Code:</strong> {coupon.code}</p>
                    <p><strong>Type:</strong> {coupon.get_offer_type_display()}</p>
                    <p><strong>Restaurant:</strong> {restaurant_name}</p>
                </div>
            </body>
            </html>
            """

    def generate_coupon_status_html(self, coupon):
        status_text = "approved" if coupon.is_active == OfferDetail.APPROVED else "rejected"
        restaurant_name = coupon.restaurant.restaurant_name if coupon.restaurant else "Global Offer"

        return f"""
        <html>
        <body>
            <h2>Coupon Status Update</h2>
            <p>Your coupon has been {status_text}.</p>
            <div style="background:#f8f9fa;padding:20px;border-radius:5px">
                <p><strong>Code:</strong> {coupon.code}</p>
                <p><strong>Status:</strong> {coupon.get_is_active_display()}</p>
                <p><strong>Restaurant:</strong> {restaurant_name}</p>
            </div>
        </body>
        </html>
        """

class RestaurantListView(viewsets.ReadOnlyModelViewSet):
    """Endpoint to list restaurants for the dropdown"""
    queryset = RestaurantMaster.objects.filter(restaurant_status=1)  # Active restaurants
    serializer_class = RestaurantMasterSerializer  # Make sure you have this serializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        logger.info(f"Restaurant list requested by user: {request.user.email}")
        try:
            response = super().list(request, *args, **kwargs)
            logger.info(f"Returning {len(response.data)} restaurants")
            return response
        except Exception as e:
            logger.error(f"Error fetching restaurant list: {str(e)}", exc_info=True)
            return Response({"error": "Failed to fetch restaurants"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def trigger_background_task(request):
    logger.info("Background task triggered manually")
    try:
        update_order_statuses()  # schedules the task
        logger.info("Background task scheduled successfully")
        return JsonResponse({'status': 'Task scheduled'})
    except Exception as e:
        logger.error(f"Error scheduling background task: {str(e)}", exc_info=True)
        return JsonResponse({'status': 'Task scheduling failed', 'error': str(e)}, status=500)