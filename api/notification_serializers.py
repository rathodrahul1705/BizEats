from rest_framework import serializers
from django.contrib.auth.models import User
from api.models import TagMaster, AssignTags, NotificationMaster, NotificationQueue, Device


class TagMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TagMaster
        fields = "__all__"


class AssignTagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignTags
        fields = "__all__"


class NotificationMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationMaster
        fields = "__all__"


class NotificationQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationQueue
        fields = "__all__"


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = "__all__"
