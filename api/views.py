from django.core.mail import send_mail
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated

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
        self.send_otp_email(user.email, user.otp)

        return Response({"message": "User registered successfully. OTP sent to email."}, status=status.HTTP_201_CREATED)

    def send_otp_email(self, to_email, otp):
        """Send OTP to user's email."""
        subject = "Your OTP for Registration"
        message = f"Your OTP for registration is: {otp}. It will expire in 5 minutes."
        send_mail(subject, message, 'your_email@example.com', [to_email])

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
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid OTP or OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")

        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

        if user.user_verified:
            # Generate OTP and send email
            user.generate_otp()
            send_mail(
                'Your OTP Code',
                f'Your OTP code is {user.otp}. It is valid for 5 minutes.',
                'no-reply@yourdomain.com',
                [user.email],
                fail_silently=False,
            )
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