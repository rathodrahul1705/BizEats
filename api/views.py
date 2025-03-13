# #from django.shortcuts import render

# # Create your views here.

# from django.http import JsonResponse

# def home(request):
#     return JsonResponse({"message": "Hello from Django!"})

# def home_page(request):
#     return JsonResponse({"message": "Welcome to homepage"})

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['full_name'] = user.full_name
        token['email'] = user.email
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add custom response with user details
        user = self.user
        data.update({
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "user_verified": user.user_verified,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            }
        })
        return data
    

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user  # Get authenticated user
        serializer = UserSerializer(user)  # Serialize user data
        return Response(serializer.data)