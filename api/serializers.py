import uuid
from rest_framework import serializers
from django.db.models import Avg
from django.contrib.auth import get_user_model
from .models import FavouriteKitchen, Order, OrderReview, RestaurantCategory, RestaurantMaster, RestaurantOwnerDetail, RestaurantLocation, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments, RestaurantMenu, UserDeliveryAddress, OrderLiveLocation

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
        fields = ['restaurant_id', 'shop_no_building', 'floor_tower', 'area_sector_locality', 'city', 'nearby_locality','latitude','longitude']

class CuisineSerializer(serializers.Serializer):
    cuisine_name = serializers.CharField()

class RestaurantMenuSerializer(serializers.Serializer):
    item_price = serializers.CharField()
    item_name = serializers.CharField()
    description = serializers.CharField()
    item_image = serializers.CharField()
    id = serializers.CharField()
    food_type = serializers.CharField()
    category = serializers.CharField()
    availability = serializers.BooleanField()
    buy_one_get_one_free = serializers.BooleanField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    discount_percent = serializers.CharField()
    discount_active = serializers.CharField()
    

class DeliveryTimingSerializer(serializers.Serializer):
    day = serializers.CharField()
    open = serializers.BooleanField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

class RestaurantMasterSerializer(serializers.ModelSerializer):
    owner_details = RestaurantOwnerDetailSerializer()
    restaurant_location = RestaurantLocationSerializer()
    menu_items = RestaurantMenuSerializer(many=True, read_only=True)  # Use the correct related name

    class Meta:
        model = RestaurantMaster
        fields = ['restaurant_name', 'profile_image', 'restaurant_status', 'owner_details', 'restaurant_location', 'menu_items']

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
        location_instance.latitude = location_data.get('latitude', location_instance.latitude)
        location_instance.longitude = location_data.get('longitude', location_instance.longitude)
        location_instance.save()

        return instance


class RestaurantStep2Serializer(serializers.Serializer):
    restaurant_id = serializers.CharField(required=True)
    profile_image = serializers.ImageField(required=False)
    cuisines = CuisineSerializer(many=True, required=True)  # List of cuisines
    delivery_timings = DeliveryTimingSerializer(many=True, required=True) 

class RestaurantSerializerByStatus(serializers.ModelSerializer):
    location = RestaurantLocationSerializer(source="restaurant_location", read_only=True)
    cuisines = CuisineSerializer(many=True, required=True)
    menu_items = RestaurantMenuSerializer(many=True, read_only=True)  # Use the correct related name

    class Meta:
        model = RestaurantMaster
        fields = [
            "restaurant_id",
            "restaurant_name",
            "profile_image",
            "created_at",
            "restaurant_status",
            "location",
            "cuisines",
            "menu_items",
        ]

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

class RestaurantMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantMenu
        fields = "__all__"  # Include all fields

class UserDeliveryAddressSerializer(serializers.ModelSerializer):
    full_address = serializers.SerializerMethodField()
    home_type_display = serializers.SerializerMethodField()  # new field just for display
    
    class Meta:
        model = UserDeliveryAddress
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "user"]

    def create(self, validated_data):
        """Ensure only one default address is set per user."""
        user = validated_data["user"]
        if validated_data.get("is_default", False):
            UserDeliveryAddress.objects.filter(user=user, is_default=True).update(is_default=False)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Ensure only one address is marked as default at a time."""
        if validated_data.get("is_default", False):
            UserDeliveryAddress.objects.filter(user=instance.user, is_default=True).update(is_default=False)
        return super().update(instance, validated_data)
    
    def get_full_address(self, obj):
        landmark = f"Landmark: {obj.near_by_landmark}" if obj.near_by_landmark else "No Landmark"
        return f"{obj.street_address}, {obj.city}, {obj.state}, {obj.zip_code}, {obj.country} ({landmark}, Type: {self.get_home_type_display(obj)})"

    def get_home_type_display(self, obj):
        """Return custom home_type value if it's 'Other'."""
        if obj.home_type == "Other":
            return obj.name_of_location or "Other"
        return obj.home_type


class OrderPlacementSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)
    restaurant_id = serializers.CharField(required=True, max_length=20)
    payment_type = serializers.ChoiceField(
        choices=Order.PAYMENT_TYPE,
        required=True
    )
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        required=True
    )
    is_takeaway = serializers.BooleanField(default=False)
    delivery_fee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    total_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    delivery_address_id = serializers.CharField(required=True)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(
        required=False,
        allow_null=True
    )
    discount_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    
class ContactUsSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    message = serializers.CharField()

class OrderLiveLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderLiveLocation
        fields = ['order', 'latitude', 'longitude']

class OrderReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderReview
        fields = ['order_id', 'user', 'rating', 'review_text', 'restaurant_id']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

class RestaurantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCategory
        fields = '__all__'
class RestaurantMasterFavSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantMaster
        fields = ['restaurant_id', 'restaurant_name', 'restaurant_status', 'profile_image']

    def get_profile_image(self, obj):
        request = self.context.get('request')
        if obj.profile_image and hasattr(obj.profile_image, 'url'):
            return request.build_absolute_uri(obj.profile_image.url)
        return None
    
class FavouriteKitchenSerializer(serializers.ModelSerializer):
    restaurant_details = serializers.SerializerMethodField()

    class Meta:
        model = FavouriteKitchen
        fields = ['id', 'restaurant', 'restaurant_details', 'created_at']

    def get_restaurant_details(self, obj):
        from .serializers import RestaurantMasterFavSerializer
        request = self.context.get('request')
        return RestaurantMasterFavSerializer(obj.restaurant, context={'request': request}).data
