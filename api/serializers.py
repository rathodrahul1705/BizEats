import uuid
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import RestaurantMaster, RestaurantOwnerDetail, RestaurantLocation, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments

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
    

    def update(self, instance, validated_data):

        # print("validated_data=====",validated_data)

        # Update the RestaurantMaster instance
        instance.restaurant_name = validated_data.get('restaurant_name', instance.restaurant_name)
        instance.save()

        # Update owner details
        owner_data = validated_data.get('owner_details', {})
        owner_instance = instance.owner_details
        owner_instance.owner_name = owner_data.get('owner_name', owner_instance.owner_name)
        owner_instance.owner_email_address = owner_data.get('owner_email_address', owner_instance.owner_email_address)
        owner_instance.owner_contact = owner_data.get('owner_contact', owner_instance.owner_contact)
        owner_instance.owner_primary_contact = owner_data.get('owner_primary_contact', owner_instance.owner_primary_contact)
        owner_instance.save()

        # Update location details
        location_data = validated_data.get('restaurant_location', {})
        location_instance = instance.restaurant_location
        location_instance.shop_no_building = location_data.get('shop_no_building', location_instance.shop_no_building)
        location_instance.floor_tower = location_data.get('floor_tower', location_instance.floor_tower)
        location_instance.area_sector_locality = location_data.get('area_sector_locality', location_instance.area_sector_locality)
        location_instance.city = location_data.get('city', location_instance.city)
        location_instance.nearby_locality = location_data.get('nearby_locality', location_instance.nearby_locality)
        location_instance.save()

        return instance

class CuisineSerializer(serializers.Serializer):
    cuisine_name = serializers.CharField()

class DeliveryTimingSerializer(serializers.Serializer):
    day = serializers.CharField()
    open = serializers.BooleanField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

class RestaurantStep2Serializer(serializers.Serializer):
    restaurant_id = serializers.CharField(required=True)
    profile_image = serializers.ImageField(required=False)
    cuisines = CuisineSerializer(many=True, required=True)  # List of cuisines
    delivery_timings = DeliveryTimingSerializer(many=True, required=True) 

class RestaurantSerializerByStatus(serializers.ModelSerializer):
    location = RestaurantLocationSerializer(source="restaurant_location", read_only=True) 

    class Meta:
        model = RestaurantMaster
        fields = ["restaurant_id", "restaurant_name", "created_at","restaurant_status", "location"]

class RestaurantListSerializer(serializers.Serializer):
    active_restaurants = RestaurantSerializerByStatus(many=True)
    live_restaurants = RestaurantSerializerByStatus(many=True)

class RestaurantDetailSerializer(serializers.Serializer):
    location = RestaurantLocationSerializer(source="restaurant_location", read_only=True) 

    class Meta:
        model = RestaurantMaster
        fields = ["restaurant_id", "restaurant_name", "created_at","restaurant_status", "location"]


class RestaurantOwnerDetailSerializerByResId(serializers.ModelSerializer):
    class Meta:
        model = RestaurantOwnerDetail
        fields = '__all__'

class RestaurantLocationSerializerByRedId(serializers.ModelSerializer):
    class Meta:
        model = RestaurantLocation
        fields = '__all__'

class RestaurantCuisineSerializerByResId(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCuisine
        fields = '__all__'

class RestaurantDeliveryTimingSerializerByResId(serializers.ModelSerializer):
    class Meta:
        model = RestaurantDeliveryTiming
        fields = '__all__'

class RestaurantDocumentsSerializerByResId(serializers.ModelSerializer):
    class Meta:
        model = RestaurantDocuments
        fields = '__all__'

class RestaurantMasterNewSerializer(serializers.ModelSerializer):
    owner_details = RestaurantOwnerDetailSerializerByResId(read_only=True)
    restaurant_location = RestaurantLocationSerializerByRedId(read_only=True)
    cuisines = RestaurantCuisineSerializerByResId(many=True, read_only=True)
    delivery_timings = RestaurantDeliveryTimingSerializerByResId( many=True, read_only=True)
    documents = RestaurantDocumentsSerializerByResId(read_only=True)

    class Meta:
        model = RestaurantMaster
        fields = '__all__'