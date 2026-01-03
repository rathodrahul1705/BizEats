from api.models import Device
from api.notification_serializers import DeviceSerializer

def register_device_for_user(user, token, platform):
    """
    Register or update device token for a user.
    Updates token if user already exists.
    """
    if not token or not platform:
        return None, False, "token and platform are required"
    
    device, created = Device.objects.update_or_create(
        user=user,
        defaults={
            "token": token,
            "platform": platform,
            "is_active": True,
        }
    )

    return DeviceSerializer(device).data, created, None

def remove_device_token(token):
    """Soft delete device token."""
    try:
        device = Device.objects.get(token=token)
        device.is_active = False
        device.save(update_fields=["is_active"])
        return True
    except Device.DoesNotExist:
        return False
