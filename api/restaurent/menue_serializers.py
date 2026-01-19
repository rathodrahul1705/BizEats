from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models import (
    RestaurantMaster, RestaurantCuisine, RestaurantCategory,
    RestaurantMenu, AddonGroup, Addon, MenuItemAddonGroup
)

User = get_user_model()

class RestaurantCuisineSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCuisine
        fields = ['id', 'name', 'description', 'is_active', 'created_at']

class RestaurantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCategory
        fields = ['id', 'name', 'description', 'is_active', 'created_at']

class RestaurantMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantMaster
        fields = ['restaurant_id', 'restaurant_name', 'restaurant_status', 'profile_image', 'created_at']

class AddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Addon
        fields = ['id', 'group', 'name', 'price', 'dietary_type', 'is_active', 'created_at']
        read_only_fields = ['created_at']
    
    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative")
        return value

class AddonGroupSerializer(serializers.ModelSerializer):
    addons = AddonSerializer(many=True, read_only=True)
    addons_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        default=[]
    )
    restaurant_name = serializers.CharField(source='restaurant.restaurant_name', read_only=True)
    
    class Meta:
        model = AddonGroup
        fields = [
            'id', 'restaurant', 'restaurant_name', 'name', 'description', 'allow_multiple_selection',
            'min_selection', 'max_selection', 'allow_multiple_quantity',
            'min_quantity', 'max_quantity', 'is_active', 'addons', 'addons_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'restaurant']  # Remove write_only here
    
    def validate(self, data):
        # Validate selection limits
        if data.get('allow_multiple_selection'):
            min_selection = data.get('min_selection', 0)
            max_selection = data.get('max_selection', 1)
            
            if min_selection < 0:
                raise serializers.ValidationError({"min_selection": "Minimum selection cannot be negative"})
            
            if min_selection > max_selection:
                raise serializers.ValidationError({
                    "min_selection": "Minimum selection cannot be greater than maximum selection"
                })
        
        # Validate quantity limits
        if data.get('allow_multiple_quantity'):
            min_quantity = data.get('min_quantity', 1)
            max_quantity = data.get('max_quantity', 10)
            
            if min_quantity < 1:
                raise serializers.ValidationError({"min_quantity": "Minimum quantity must be at least 1"})
            
            if min_quantity > max_quantity:
                raise serializers.ValidationError({
                    "min_quantity": "Minimum quantity cannot be greater than maximum quantity"
                })
        
        # Validate addons_data
        addons_data = data.get('addons_data', [])
        for addon_data in addons_data:
            if 'name' not in addon_data or not addon_data['name'].strip():
                raise serializers.ValidationError({"addons_data": "Each addon must have a name"})
            if 'price' not in addon_data or float(addon_data.get('price', 0)) < 0:
                raise serializers.ValidationError({"addons_data": "Each addon must have a valid price"})
        
        return data
    
    def create(self, validated_data):
        from django.db import transaction
        
        addons_data = validated_data.pop('addons_data', [])
        
        with transaction.atomic():
            addon_group = AddonGroup.objects.create(**validated_data)
            
            # Create addons
            for addon_data in addons_data:
                # Ensure price is properly converted
                addon_data['price'] = float(addon_data.get('price', 0))
                Addon.objects.create(group=addon_group, **addon_data)
        
        return addon_group
    
    def update(self, instance, validated_data):
        from django.db import transaction
        
        addons_data = validated_data.pop('addons_data', None)
        
        with transaction.atomic():
            # Update addon group
            for attr, value in validated_data.items():
                if attr != 'restaurant':  # Don't update restaurant
                    setattr(instance, attr, value)
            instance.save()
            
            # Handle addons update if provided
            if addons_data is not None:
                self._update_addons(instance, addons_data)
        
        return instance
    
    def _update_addons(self, addon_group, addons_data):
        """Helper method to update addons"""
        existing_addon_ids = set(addon_group.addons.values_list('id', flat=True))
        updated_addon_ids = set()
        
        # Update or create addons
        for addon_data in addons_data:
            addon_id = addon_data.get('id')
            
            if addon_id and addon_group.addons.filter(id=addon_id).exists():
                # Update existing addon
                addon = addon_group.addons.get(id=addon_id)
                for attr, value in addon_data.items():
                    if attr != 'id':
                        if attr == 'price':
                            value = float(value)
                        setattr(addon, attr, value)
                addon.save()
                updated_addon_ids.add(addon_id)
            else:
                # Create new addon
                addon_data.pop('id', None)
                # Ensure price is properly converted
                addon_data['price'] = float(addon_data.get('price', 0))
                Addon.objects.create(group=addon_group, **addon_data)
        
        # Delete addons not in the updated list
        addons_to_delete = existing_addon_ids - updated_addon_ids
        addon_group.addons.filter(id__in=addons_to_delete).delete()

class RestaurantMenuSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    cuisines_list = RestaurantCuisineSerializer(source='cuisines', many=True, read_only=True)
    discounted_price = serializers.SerializerMethodField()
    restaurant_name = serializers.CharField(source='restaurant.restaurant_name', read_only=True)
    
    class Meta:
        model = RestaurantMenu
        fields = [
            'id', 'restaurant', 'restaurant_name', 'item_name', 'item_price', 
            'discount_percent', 'discount_active', 'discounted_price', 'description',
            'category', 'category_name', 'cuisines', 'cuisines_list', 'item_image',
            'spice_level', 'preparation_time', 'serving_size', 'availability',
            'stock_quantity', 'food_type', 'buy_one_get_one_free', 'start_time',
            'end_time', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_discounted_price(self, obj):
        return obj.discounted_price
    
    def validate(self, data):
        # Validate discount
        discount_percent = data.get('discount_percent')
        if discount_percent and (discount_percent < 0 or discount_percent > 100):
            raise serializers.ValidationError({"discount_percent": "Discount percentage must be between 0 and 100"})
        
        # Validate time range
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time"})
        
        return data
    
    def to_representation(self, instance):
        """Custom representation to handle cuisines"""
        representation = super().to_representation(instance)
        
        # Convert cuisines to list of IDs
        representation['cuisines'] = list(instance.cuisines.values_list('id', flat=True))
        
        # Include discount status as boolean
        representation['discount_active'] = bool(representation['discount_active'])
        
        return representation
    
    def to_internal_value(self, data):
        """Handle cuisines list input"""
        internal_value = super().to_internal_value(data)
        
        # Handle cuisines from request
        cuisines_data = data.get('cuisines', [])
        if isinstance(cuisines_data, str):
            cuisines_data = cuisines_data.split(',')
        
        internal_value['cuisines_data'] = [int(cid) for cid in cuisines_data if cid]
        
        return internal_value
    
    def create(self, validated_data):
        from django.db import transaction
        
        cuisines_data = validated_data.pop('cuisines_data', [])
        
        with transaction.atomic():
            menu_item = RestaurantMenu.objects.create(**validated_data)
            
            # Add cuisines
            if cuisines_data:
                menu_item.cuisines.set(cuisines_data)
        
        return menu_item
    
    def update(self, instance, validated_data):
        from django.db import transaction
        
        cuisines_data = validated_data.pop('cuisines_data', None)
        
        with transaction.atomic():
            # Update menu item
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            # Update cuisines if provided
            if cuisines_data is not None:
                instance.cuisines.set(cuisines_data)
        
        return instance

class MenuItemAddonGroupSerializer(serializers.ModelSerializer):
    addon_group_name = serializers.CharField(source='addon_group.name', read_only=True)
    addon_group_details = AddonGroupSerializer(source='addon_group', read_only=True)
    
    class Meta:
        model = MenuItemAddonGroup
        fields = ['id', 'menu_item', 'addon_group', 'addon_group_name', 'addon_group_details', 'is_required', 'created_at']

class RestaurantMenuDetailSerializer(RestaurantMenuSerializer):
    """Serializer for detailed menu item view with addon groups"""
    addon_groups = MenuItemAddonGroupSerializer(source='addon_groups_link', many=True, read_only=True)
    
    class Meta(RestaurantMenuSerializer.Meta):
        fields = RestaurantMenuSerializer.Meta.fields + ['addon_groups']