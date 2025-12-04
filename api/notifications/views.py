from rest_framework import generics
from rest_framework.response import Response
# from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework import status
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from api.models import TagMaster, AssignTags, NotificationMaster, NotificationQueue
from api.notification_serializers import (
    DeviceSerializer, TagMasterSerializer, AssignTagsSerializer,
    NotificationMasterSerializer, NotificationQueueSerializer,Device
)

# --------------------------
# CRUD APIs
# --------------------------

class TagMasterCreateView(generics.CreateAPIView):
    queryset = TagMaster.objects.all()
    serializer_class = TagMasterSerializer


class TagMasterListView(generics.ListAPIView):
    queryset = TagMaster.objects.all()
    serializer_class = TagMasterSerializer


class AssignTagCreateView(generics.ListAPIView):
    queryset = AssignTags.objects.all()
    serializer_class = AssignTagsSerializer


class NotificationMasterCreateView(generics.CreateAPIView):
    queryset = NotificationMaster.objects.all()
    serializer_class = NotificationMasterSerializer


class NotificationMasterListView(generics.ListAPIView):
    queryset = NotificationMaster.objects.all()
    serializer_class = NotificationMasterSerializer


class NotificationQueueCreateView(generics.CreateAPIView):
    queryset = NotificationQueue.objects.all()
    serializer_class = NotificationQueueSerializer


class NotificationQueueListView(generics.ListAPIView):
    queryset = NotificationQueue.objects.all()
    serializer_class = NotificationQueueSerializer

class DeviceRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        platform = request.data.get('platform')

        if not token or not platform:
            return Response({"error": "token and platform are required"}, status=400)

        # If same device token exists, update its user + platform
        device, created = Device.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'platform': platform,
                'is_active': True
            }
        )

        serializer = DeviceSerializer(device)
        return Response({
            "message": "Device registered successfully",
            "created": created,
            "device": serializer.data
        }, status=201)
    
class DeviceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        devices = Device.objects.all()   # ← list every device
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)
class DeviceDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            device = Device.objects.get(id=pk, user=request.user)
        except Device.DoesNotExist:
            return Response({"error": "Device not found"}, status=404)

        device.delete()
        return Response({"message": "Device deleted successfully"})
    
class RemoveDeviceToken(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("device_token")

        # 1️⃣ Validate input
        if not token:
            return Response(
                {"error": "device_token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # 2️⃣ Check if device exists
        device_qs = Device.objects.filter(user=user, token=token, is_active=True)

        if not device_qs.exists():
            return Response(
                {"message": "Device token not found or already inactive"},
                status=status.HTTP_200_OK
            )

        # 3️⃣ Deactivate token
        device_qs.update(is_active=False)

        return Response(
            {"message": "Device token removed successfully"},
            status=status.HTTP_200_OK
        )

