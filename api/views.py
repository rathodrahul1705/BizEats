from django.core.mail import send_mail
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from api.emailer.email_notifications import generate_coupon_html, generate_coupon_status_html, send_otp_email, send_contact_email
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


logger = logging.getLogger(__name__)

class ReactAppView(View):
    def get(self, request):
        return render(request, "index.html")

class UserRegistrationView(APIView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        full_name = request.data.get("full_name")
        contact_number = request.data.get("contact_number")
        
        # Validate inputs
        if not email or not full_name:
            return Response({"error": "Email and full_name are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Create the user with provided email and full_name (contact_number is optional)
        user = User.objects.create_user(email=email, full_name=full_name, contact_number=contact_number)

        # Generate OTP and send email
        user.generate_otp()
        send_otp_email(user,'Eatoor Registration Verification Code', otp_type="registration")
        return Response({"message": "User registered successfully. OTP sent to email."}, status=status.HTTP_201_CREATED)
    
class OTPVerificationView(APIView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        otp = request.data.get("otp")

        # Check if email and OTP are provided
        if not email or not otp:
            return Response({"error": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP
        if user.verify_otp(otp):
            # OTP is valid, generate tokens
            refresh = RefreshToken.for_user(user)
            is_restaurant_register = RestaurantMaster.objects.filter(user=user).exists()

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
            return Response({"error": "Invalid OTP or OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")

        logger.info(f"User email {email}")

        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

        if user:
            user.generate_otp()
            send_otp_email(user,'Eatoor Login Verification Code', otp_type="login")
            return Response({
                "message": "OTP sent to email. Please verify.",
            }, status=status.HTTP_200_OK)
        
        return Response({"error": "User is not verified."}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]  # Only authenticated users can access this view
    
    def get(self, request, *args, **kwargs):
        # Get the currently authenticated user
        user = request.user
        
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
        serializer = ContactUsSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        name = data['name']
        email = data['email']
        message = data['message']

        logger.info(f"New Contact Message: {email} - {name}")

        # Optional: Save to database
        ContactMessage.objects.create(name=name, email=email, message=message)

        # Send Email
        send_contact_email(name, email, message)

        return Response({
            "message": "Thank you for contacting us. We’ll get back to you soon!"
        }, status=status.HTTP_200_OK)

class CustomTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')

        if refresh_token is None:
            return Response({'detail': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            new_access_token = str(token.access_token)

            return Response({
                'access': new_access_token
            })

        except TokenError as e:
            return Response({
                'detail': 'Token is invalid or expired',
                'error': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)
        

class UserProfileUpdate(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        email = request.data.get('email')
        contact_number = request.data.get('contact_number')

        if email:
            user.email = email
        if contact_number:
            user.contact_number = contact_number

        user.save()

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
        data = request.data.copy()
        data['user'] = request.user.id
        serializer = OrderReviewSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Review submitted successfully", "data": serializer.data, "status":"success"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FetchReviewView(APIView):
    def get(self, request, *args, **kwargs):
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

        return Response(
            {
                "rating_ratio": round(review_stats['avg_rating'] or 0, 1),
                "total_reviews": review_stats['total_reviews'],
                "reviews": reviews_data
            },
            status=status.HTTP_200_OK
        )

class FetchUserList(APIView):
    def get(self, request, *args, **kwargs):
        users = User.objects.all().order_by('-id').values('id', 'email', 'full_name', 'contact_number', 'is_active')
        return Response({"users": list(users)}, status=status.HTTP_200_OK)

class FetchCartList(APIView):
    def get(self, request, *args, **kwargs):
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

        return Response({"carts": cart_data}, status=status.HTTP_200_OK)

class RestaurantCategoryViewSet(viewsets.ModelViewSet):
    queryset = RestaurantCategory.objects.all()
    serializer_class = RestaurantCategorySerializer

    def get_queryset(self):
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            return self.queryset.filter(restaurant_id=restaurant_id)
        return self.queryset
# class OfferViewSet(viewsets.ModelViewSet):
#     queryset = OfferDetail.objects.all()
#     serializer_class = OfferSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         user = self.request.user
#         queryset = super().get_queryset()
#         restaurant = self.request.query_params.get('restaurant_id')
#         code = self.request.query_params.get('code')

#         # If code is provided in query params, filter by code
#         if code:
#             queryset = queryset.filter(code=code)

#         # Admin role (assuming role=2 means admin)
#         if hasattr(user, 'role') and user.role == 2:
#             if restaurant:
#                 return queryset.filter(restaurant_id=restaurant)
#             return queryset
        
#         # For non-admin users
#         if restaurant:
#             return queryset.filter(
#                 restaurant_id=restaurant,
#             )
        
#         # Default return for non-admin with no restaurant_id
#         return queryset.none()

#     def perform_create(self, serializer):
#    
#      serializer.save()
# class OfferViewSet(viewsets.ModelViewSet):
#     serializer_class = OfferSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         user = self.request.user
#         restaurant = self.request.query_params.get('restaurant_id')
#         code = self.request.query_params.get('code')

#         # Start with base queryset
#         queryset = OfferDetail.objects.all().order_by('-id')

#         # Filter by code if provided
#         if code:
#             queryset = queryset.filter(code=code)

#         # Admin role (assuming role=2 means admin)
#         if hasattr(user, 'role') and user.role == 2:
#             if restaurant:
#                 return queryset.filter(restaurant_id=restaurant)
#             return queryset
        
#         # For non-admin users
#         if restaurant:
#             return queryset.filter(
#                 restaurant_id=restaurant,
#             )
        
#         # Default return for non-admin with no restaurant_id
#         return queryset.none()

#     def perform_create(self, serializer):
#         instance = serializer.save()
        
#         # Send email only for coupon_code type offers
#         if instance.offer_type == 'coupon_code' and instance.code:
#             self.send_coupon_email(instance)
    
#     def send_coupon_email(self, coupon):
#         """Send appropriate email based on coupon status"""

#         # Email to vendor (created)
#         vendor_html = generate_coupon_html(coupon, is_vendor=True)

#         vendor_recipient_list = list(filter(None, [
#             getattr(coupon.restaurant.owner_details, "owner_email_address", None)
#         ]))
        
#         send_mail(
#             subject=f"Your coupon {coupon.code} is pending approval",
#             message=strip_tags(vendor_html),
#             html_message=vendor_html,
#             from_email=settings.DEFAULT_FROM_EMAIL,
#             recipient_list=vendor_recipient_list,  # Removed the extra list wrapping
#             fail_silently=False,
#         )

#         # Get all admin users (where role=2)
#         User = get_user_model()
#         admin_emails = User.objects.filter(role=2).values_list('email', flat=True)
        
#         # Convert to list and filter out any empty emails
#         admin_recipients = list(filter(None, admin_emails))
        
#         # Only send to admins if there are any
#         if admin_recipients:
#             admin_html = generate_coupon_html(coupon, is_vendor=False)
#             send_mail(
#                 subject=f"Approval needed for coupon {coupon.code}",
#                 message=strip_tags(admin_html),
#                 html_message=admin_html,
#                 from_email=settings.DEFAULT_FROM_EMAIL,
#                 recipient_list=admin_recipients,
#                 fail_silently=False,
#             )
    
class OfferViewSet(viewsets.ModelViewSet):
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        restaurant = self.request.query_params.get('restaurant_id')
        code = self.request.query_params.get('code')

        queryset = OfferDetail.objects.all().order_by('-id')

        if code:
            queryset = queryset.filter(code=code)

        if hasattr(user, 'role') and user.role == 2:  # Admin
            if restaurant:
                return queryset.filter(restaurant_id=restaurant)
            return queryset

        if restaurant:
            return queryset.filter(restaurant_id=restaurant)

        return queryset.none()

    def perform_create(self, serializer):
        instance = serializer.save()

        if instance.offer_type == 'coupon_code' and instance.code:
            self.send_coupon_email(instance)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        prev_status = instance.is_active  # Capture status before update

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        new_status = updated_instance.is_active

        # Check if status changed to Approved (1) or Rejected (0)
        if (
            prev_status != new_status and 
            updated_instance.offer_type == 'coupon_code' and 
            new_status in [0, 1]  # Assuming 0 = Rejected, 1 = Approved
        ):
            self.send_coupon_status_update_email(updated_instance)

        return Response(serializer.data)

    def send_coupon_email(self, coupon):
        """Send email when coupon is created (Pending Approval)"""
        vendor_html = generate_coupon_html(coupon, is_vendor=True)

        vendor_recipient_list = list(filter(None, [
            getattr(coupon.restaurant.owner_details, "owner_email_address", None)
        ]))

        send_mail(
            subject=f"Your coupon {coupon.code} is pending approval",
            message=strip_tags(vendor_html),
            html_message=vendor_html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=vendor_recipient_list,
            fail_silently=False,
        )

        User = get_user_model()
        admin_emails = User.objects.filter(role=2).values_list('email', flat=True)
        admin_recipients = list(filter(None, admin_emails))

        if admin_recipients:
            admin_html = generate_coupon_html(coupon, is_vendor=False)
            send_mail(
                subject=f"Approval needed for coupon {coupon.code}",
                message=strip_tags(admin_html),
                html_message=admin_html,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_recipients,
                fail_silently=False,
            )

    def send_coupon_status_update_email(self, coupon):
        """Send email when coupon status is changed to Approved or Rejected"""

        vendor_email = getattr(coupon.restaurant.owner_details, "owner_email_address", None)
        if not vendor_email:
            return

        status_text = "approved" if coupon.is_active == 1 else "rejected"
        subject = f"Your coupon {coupon.code} has been {status_text}"
        body_html = generate_coupon_status_html(coupon)  # You can create a different HTML for this
        
        send_mail(
            subject=subject,
            message=strip_tags(body_html),
            html_message=body_html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[vendor_email],
            fail_silently=False,
        )
class RestaurantListView(viewsets.ReadOnlyModelViewSet):
    """Endpoint to list restaurants for the dropdown"""
    queryset = RestaurantMaster.objects.filter(restaurant_status=1)  # Active restaurants
    serializer_class = RestaurantMasterSerializer  # Make sure you have this serializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

def trigger_background_task(request):
    update_order_statuses()  # schedules the task
    return JsonResponse({'status': 'Task scheduled'})