# accounts/views.py
import random
from datetime import timedelta
from django.utils.timezone import now
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from rest_framework.permissions import IsAuthenticated
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()

# Constants (should be moved to settings.py or environment variables in production)
TWILIO_ACCOUNT_SID = f"{settings.TWILIO_ACCOUNT_SID}"
TWILIO_AUTH_TOKEN = f"{settings.TWILIO_AUTH_TOKEN}"
TWILIO_PHONE_NUMBER = f"{settings.TWILIO_PHONE_NUMBER}"
OTP_EXPIRY_SECONDS = 30  # OTP expires in 30 seconds
OTP_LENGTH = 6   # 6-digit OTP

print("TWILIO_ACCOUNT_SID===",TWILIO_ACCOUNT_SID)
print("TWILIO_AUTH_TOKEN===",TWILIO_AUTH_TOKEN)
print("TWILIO_PHONE_NUMBER===",TWILIO_PHONE_NUMBER)

# Initialize Twilio client once (better performance)
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


def send_otp_via_twilio(contact_number, otp):
    """Send OTP using Twilio SMS API."""
    try:
        message = twilio_client.messages.create(
            body=f"Your EATOOR login OTP is {otp}",
            from_=TWILIO_PHONE_NUMBER,
            to=f"+91{contact_number}"  # Assuming Indian numbers, adjust as needed
        )
        return message.sid
    except TwilioRestException as e:
        raise Exception(f"Twilio error: {str(e)}")


class BaseOTPView(APIView):
    permission_classes = [AllowAny]
    
    def generate_otp(self):
        return str(random.randint(10**(OTP_LENGTH-1), 10**OTP_LENGTH - 1))
    
    def update_user_otp(self, user):
        user.otp = self.generate_otp()
        user.otp_expiry = now() + timedelta(seconds=OTP_EXPIRY_SECONDS)
        user.save(update_fields=["otp", "otp_expiry"])
        return user.otp


class MobileLoginSendOTP(BaseOTPView):
    """
    Step 1: Accept mobile number, generate and send OTP.
    """
    def post(self, request, *args, **kwargs):
        contact = request.data.get("contact_number")
        
        if not contact:
            return Response(
                {"error": "Contact number is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user, created = User.objects.get_or_create(
            contact_number=contact,
            defaults={
                "full_name": "",
                "email": f"{contact}@eatoor.com",
                "user_verified": False,
            }
        )

        otp = self.update_user_otp(user)

        try:
            send_otp_via_twilio(contact, otp)
        except Exception as e:
            return Response(
                {"error": f"OTP sending failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            "message": "OTP sent successfully.",
            "user_exists": not created,
            "expiry_seconds": OTP_EXPIRY_SECONDS
        }, status=status.HTTP_200_OK)


class MobileLoginVerifyOTP(BaseOTPView):
    """
    Step 2: Verify OTP and return JWT tokens.
    """
    def post(self, request, *args, **kwargs):
        contact = request.data.get("contact_number")
        otp = request.data.get("otp")

        if not contact or not otp:
            return Response(
                {"error": "Contact number and OTP are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(contact_number=contact)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not user.otp or user.otp != otp:
            return Response(
                {"error": "Invalid OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if now() > user.otp_expiry:
            return Response(
                {"error": "OTP expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # OTP is valid
        user.user_verified = True
        user.is_mobile_verified = True
        user.mobile_verified_at = now()
        user.otp = None
        user.otp_expiry = None
        user.save(update_fields=["user_verified", "otp", "otp_expiry","is_mobile_verified","mobile_verified_at"])

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        if not user.full_name and user.delivery_preference is None:
            navigate_to = "PersonalDetailsScreen"
        else:
            navigate_to = "Home"

        return Response({
            "message": "Login successful.",
            "user": {
                "id": user.id,
                "full_name": user.full_name or "",
                "contact_number": user.contact_number,
                "email": user.email,
                "role": getattr(user, "role", "customer"),
                "user_verified": user.user_verified,
                "is_mobile_verified":user.is_mobile_verified,
                "mobile_verified_at":user.mobile_verified_at,
                "is_email_verified":user.is_email_verified,
                "email_verified_at":user.email_verified_at,
            },
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            "navigate_to": navigate_to
        }, status=status.HTTP_200_OK)


class MobileLoginResendOTP(BaseOTPView):
    """
    Step 3: Resend OTP if user already exists.
    """
    def post(self, request, *args, **kwargs):
        contact = request.data.get("contact_number")

        if not contact:
            return Response(
                {"error": "Contact number is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(contact_number=contact)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        otp = self.update_user_otp(user)

        try:
            send_otp_via_twilio(contact, otp)
        except Exception as e:
            return Response(
                {"error": f"OTP resend failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            "message": "OTP resent successfully.",
            "expiry_seconds": OTP_EXPIRY_SECONDS
        }, status=status.HTTP_200_OK)
    
class UserProfileUpdates(APIView):
    """
    Update user personal details:
    - Full Name
    - Email
    - Contact Number
    - Delivery Preference (1 for veg, 2 for non-veg)
    - WhatsApp update flag (1 for yes, 0 for no)
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        if 'full_name' in data:
            user.full_name = data['full_name'].strip()

        if 'email' in data:
            email = data['email'].strip().lower()
            try:
                validate_email(email)
                if User.objects.exclude(pk=user.pk).filter(email=email).exists():
                    return Response({"error": "Email already in use."}, status=status.HTTP_400_BAD_REQUEST)
                user.email = email
            except ValidationError:
                return Response({"error": "Invalid email format."}, status=status.HTTP_400_BAD_REQUEST)

        if 'contact_number' in data:
            contact = data['contact_number'].strip()
            if User.objects.exclude(pk=user.pk).filter(contact_number=contact).exists():
                return Response({"error": "Contact number already in use."}, status=status.HTTP_400_BAD_REQUEST)
            user.contact_number = contact

        if 'delivery_preference' in data:
            try:
                preference = int(data['delivery_preference'])
                if preference not in [1, 2]:
                    raise ValueError
                user.delivery_preference = preference
            except (ValueError, TypeError):
                return Response(
                    {"error": "Delivery preference must be 1 (veg) or 2 (non-veg)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if 'whatsapp_updates' in data:
            try:
                whatsapp_flag = int(data['whatsapp_updates'])
                if whatsapp_flag not in [0, 1]:
                    raise ValueError
                user.whatsapp_updates = bool(whatsapp_flag)
            except (ValueError, TypeError):
                return Response(
                    {"error": "WhatsApp update flag must be 0 (no) or 1 (yes)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        user.save()

        return Response({
            "message": "Profile updated successfully.",
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "contact_number": user.contact_number,
                "email": user.email,
                "delivery_preference": user.delivery_preference,
                "whatsapp_updates": int(user.whatsapp_updates) if user.whatsapp_updates is not None else None,
                "role": getattr(user, "role", "customer"),
                "user_verified": user.user_verified,
                "is_mobile_verified":user.is_mobile_verified,
                "mobile_verified_at":user.mobile_verified_at,
                "is_email_verified":user.is_email_verified,
                "email_verified_at":user.email_verified_at,
            }
        }, status=status.HTTP_200_OK)

class SendEmailOTP(APIView):
    """
    Step 1: Send OTP to user's email.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get("email")
        user = request.user

        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        otp = str(random.randint(100000, 999999))
        expiry_time = now() + timedelta(seconds=30)

        user.otp = otp
        user.otp_expiry = expiry_time
        user.save(update_fields=["otp", "otp_expiry"])

        send_mail(
            subject="Your EATOOR Email OTP",
            message=f"Your OTP is {otp}. It will expire in 30 seconds.",
            from_email="no-reply@eatoor.com",
            recipient_list=[email],
        )

        return Response({"message": "OTP sent to email."}, status=status.HTTP_200_OK)

class EmailLoginVerifyOTP(APIView):
    """
    Step 2: Verify email OTP and return JWT tokens.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        email = request.data.get("email")
        otp = request.data.get("otp")
        
        if not email or not otp:
            return Response({"error": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.otp or user.otp != otp:
            return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        if now() > user.otp_expiry:
            return Response({"error": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

        # OTP is valid — update verification status
        user.user_verified = True
        user.is_email_verified = True
        user.email = email
        user.email_verified_at = now()
        user.otp = None
        user.otp_expiry = None
        user.save(update_fields=[
            "user_verified", "is_email_verified", "email_verified_at",
            "otp", "otp_expiry", "email"
        ])

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        # Determine where to navigate after login
        navigate_to = (
            "PersonalDetailsScreen"
            if not user.full_name or user.delivery_preference is None
            else "Home"
        )

        return Response({
            "message": "Login successful.",
            "user": {
                "id": user.id,
                "full_name": user.full_name or "",
                "contact_number": user.contact_number,
                "email": user.email,
                "role": getattr(user, "role", "customer"),
                "user_verified": user.user_verified,
                "is_mobile_verified": user.is_mobile_verified,
                "mobile_verified_at": user.mobile_verified_at,
                "is_email_verified": user.is_email_verified,
                "email_verified_at": user.email_verified_at,
            },
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            "navigate_to": navigate_to
        }, status=status.HTTP_200_OK)