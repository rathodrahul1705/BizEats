from rest_framework import serializers
from django.contrib.auth.models import User
from api.models import TagMaster, AssignTags, NotificationMaster, NotificationQueue, Device


class TagMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TagMaster
        fields = "__all__"


class AssignTagsSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source='user.email', read_only=True)
    contact_number = serializers.CharField(source='user.contact_number', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    tag_name = serializers.CharField(source='tag.name', read_only=True)

    class Meta:
        model = AssignTags
        fields = "__all__"



class NotificationMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationMaster
        fields = "__all__"


class NotificationQueueSerializer(serializers.ModelSerializer):
    template_key = serializers.CharField(source="template.key", read_only=True)
    target_tags_details = TagMasterSerializer(source="target_tags", many=True, read_only=True)
    class Meta:
        model = NotificationQueue
        fields = "__all__"



class DeviceSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source='user.email', read_only=True)
    contact_number = serializers.CharField(source='user.contact_number', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    class Meta:
        model = Device
        fields = "__all__"
