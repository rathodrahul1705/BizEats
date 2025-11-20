from rest_framework import generics
from rest_framework.response import Response
# from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from django.utils import timezone

from api.models import TagMaster, AssignTags, NotificationMaster, NotificationQueue
from api.notification_serializers import (
    TagMasterSerializer, AssignTagsSerializer,
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


class AssignTagCreateView(generics.CreateAPIView):
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