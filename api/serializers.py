import uuid
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import RestaurantMaster, RestaurantOwnerDetail, RestaurantLocation

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["full_name", "email", "contact_number", "role"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        user.generate_otp()  # Generate OTP on registration
        return user

class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

import uuid
from rest_framework import serializers
from .models import RestaurantMaster, RestaurantOwnerDetail, RestaurantLocation

class RestaurantOwnerDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantOwnerDetail
        fields = ['restaurant_id', 'owner_name', 'owner_email_address', 'owner_contact', 'owner_primary_contact']

class RestaurantLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantLocation
        fields = ['restaurant_id', 'shop_no_building', 'floor_tower', 'area_sector_locality', 'city', 'nearby_locality']

class RestaurantMasterSerializer(serializers.ModelSerializer):
    owner_details = RestaurantOwnerDetailSerializer()
    restaurant_location = RestaurantLocationSerializer()

    class Meta:
        model = RestaurantMaster
        fields = ['restaurant_name', 'owner_details', 'restaurant_location']

    def generate_unique_restaurant_id(self, name):
        """Generate a unique restaurant ID."""
        prefix = ''.join(name.split()).upper()[:3]  # First 3 letters of restaurant name
        while True:
            unique_number = str(uuid.uuid4().int)[:8]  # 8-digit unique number
            restaurant_id = f"{prefix}{unique_number}"  # Example: BIZ12345678
            if not RestaurantMaster.objects.filter(restaurant_id=restaurant_id).exists():
                return restaurant_id  # Ensure uniqueness

    def create(self, validated_data):
        user = self.context['request'].user  # Get authenticated user

        # Check if restaurant with the same name exists
        if RestaurantMaster.objects.filter(user=user, restaurant_name=validated_data['restaurant_name']).exists():
            raise serializers.ValidationError({"error": "Restaurant with this name is already registered."})

        # Generate unique restaurant_id
        restaurant_id = self.generate_unique_restaurant_id(validated_data['restaurant_name'])

        # Create the RestaurantMaster entry
        restaurant_master = RestaurantMaster.objects.create(
            restaurant_name=validated_data['restaurant_name'],
            restaurant_id=restaurant_id,
            restaurant_status=1,  # Default 'Active' status
            user=user  # Authenticated user
        )

        # Extract and create related entries
        owner_data = validated_data.pop('owner_details')
        location_data = validated_data.pop('restaurant_location')

        # Add restaurant_id explicitly
        owner_data['restaurant_id'] = restaurant_id
        location_data['restaurant_id'] = restaurant_id

        # Create RestaurantOwnerDetail
        RestaurantOwnerDetail.objects.create(restaurant=restaurant_master, **owner_data)

        # Create RestaurantLocation
        RestaurantLocation.objects.create(restaurant=restaurant_master, **location_data)

        return restaurant_master

class CuisineSerializer(serializers.Serializer):
    cuisine_name = serializers.CharField()

class DeliveryTimingSerializer(serializers.Serializer):
    day = serializers.CharField()
    open = serializers.BooleanField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

class RestaurantStep2Serializer(serializers.Serializer):
    restaurant_id = serializers.CharField()
    profile_image = serializers.ImageField(required=False)
    cuisines = CuisineSerializer(many=True)
    delivery_timings = DeliveryTimingSerializer(many=True)


