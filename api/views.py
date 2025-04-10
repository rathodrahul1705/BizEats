from django.core.mail import send_mail
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.emailer.email_notifications import send_otp_email
from .models import User, RestaurantMaster
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from django.views.generic import TemplateView
from django.views.generic import View
from django.shortcuts import render
import logging

logger = logging.getLogger(__name__)

class ReactAppView(View):
    def get(self, request):
        return render(request, "index.html")

class UserRegistrationView(APIView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        full_name = request.data.get("full_name")
        
        # Validate inputs
        if not email or not full_name:
            return Response({"error": "Email and full_name are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Create the user with provided email and full_name (contact_number is optional)
        user = User.objects.create_user(email=email, full_name=full_name)

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