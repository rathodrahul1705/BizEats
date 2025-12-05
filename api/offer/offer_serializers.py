# serializers.py
from rest_framework import serializers
from api.models import OfferDetail
from api.serializers import RestaurantMasterSerializer

class OfferSerializer(serializers.ModelSerializer):
    restaurant_details = RestaurantMasterSerializer(source='restaurant', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = OfferDetail
        fields = [
            'id',
            'offer_type',
            'sub_filter',
            'code',
            'discount_type',
            'discount_value',
            'minimum_order_amount',
            'valid_from',
            'valid_to',
            'max_uses',
            'max_uses_per_user',
            'times_used',
            'is_active',
            'restaurant',
            'restaurant_details',
            'created_at',
            'updated_at',
            'is_valid',
            'max_delivery_distance',
            'max_delivery_fee',
            'credit_amount',
            'credit_type',
            'credit_expiry_days',
        ]
        read_only_fields = ['times_used', 'created_at', 'updated_at', 'is_valid']
        extra_kwargs = {
            'restaurant': {'required': False, 'allow_null': True},
            'code': {'required': False, 'allow_null': True},
            'discount_type': {'required': False, 'allow_null': True},
            'discount_value': {'required': False, 'allow_null': True},
            'max_delivery_distance': {'required': False, 'allow_null': True},
            'max_delivery_fee': {'required': False, 'allow_null': True},
            'credit_amount': {'required': False, 'allow_null': True},
            'credit_type': {'required': False, 'allow_null': True},
            'credit_expiry_days': {'required': False, 'allow_null': True},
            'sub_filter': {'required': False, 'allow_null': True},
            'minimum_order_amount': {'required': False, 'default': 0},
        }
    
    def validate(self, data):
        """Custom validation matching model validation"""
        offer_type = data.get('offer_type', self.instance.offer_type if self.instance else None)
        sub_filter = data.get('sub_filter', self.instance.sub_filter if self.instance else None)
        
        # Offer type validation
        if not offer_type:
            raise serializers.ValidationError({'offer_type': 'Offer type is required'})
        
        # Coupon code validation
        if offer_type == 'coupon_code':
            if not data.get('code'):
                raise serializers.ValidationError({'code': 'Coupon code is required for coupon code offers'})
            elif len(data.get('code', '')) > 20:
                raise serializers.ValidationError({'code': 'Coupon code cannot exceed 20 characters'})
        
        # Restaurant validation for specific offer types
        if offer_type == 'restaurant_deal' and not data.get('restaurant'):
            raise serializers.ValidationError({'restaurant': 'Restaurant is required for restaurant deals'})
        
        if sub_filter == 'specific_restaurant' and not data.get('restaurant'):
            raise serializers.ValidationError({'restaurant': 'Restaurant required when sub_filter is specific_restaurant'})
        
        # Restaurant validation - non-admin users must have restaurant
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            if not hasattr(user, 'role') or user.role != 2:  # Not admin
                if 'restaurant' not in data and not self.instance:
                    raise serializers.ValidationError({'restaurant': 'Restaurant is required for restaurant users'})
        
        # Discount validation for applicable offer types
        discount_required_types = ['coupon_code', 'auto_discount', 'credit']
        if offer_type in discount_required_types:
            if not data.get('discount_type'):
                raise serializers.ValidationError({'discount_type': 'Discount type is required for this offer type'})
            if not data.get('discount_value'):
                raise serializers.ValidationError({'discount_value': 'Discount value is required for this offer type'})
            
            if data.get('discount_type') == 'percentage' and data.get('discount_value', 0) > 100:
                raise serializers.ValidationError({
                    'discount_value': 'Percentage discount cannot exceed 100%'
                })
        
        # Free Delivery validation
        if offer_type == 'free_delivery':
            if sub_filter == 'minimum_amount' and not data.get('minimum_order_amount'):
                raise serializers.ValidationError({
                    'minimum_order_amount': 'Minimum order amount is required for this filter'
                })
            
            if sub_filter == 'location_based':
                if not data.get('max_delivery_distance'):
                    raise serializers.ValidationError({
                        'max_delivery_distance': 'Maximum delivery distance is required for location-based free delivery'
                    })
                elif data.get('max_delivery_distance', 0) <= 0:
                    raise serializers.ValidationError({
                        'max_delivery_distance': 'Maximum delivery distance must be positive'
                    })
                
                if not data.get('max_delivery_fee'):
                    raise serializers.ValidationError({
                        'max_delivery_fee': 'Maximum delivery fee is required for location-based free delivery'
                    })
                elif data.get('max_delivery_fee', 0) < 0:
                    raise serializers.ValidationError({
                        'max_delivery_fee': 'Maximum delivery fee cannot be negative'
                    })
        
        # Credit validation
        if offer_type == 'credit':
            if not data.get('credit_amount') and not data.get('discount_value'):
                raise serializers.ValidationError({
                    'credit_amount': 'Credit amount or discount value is required for credit offers'
                })
            elif data.get('credit_amount') and data.get('credit_amount', 0) <= 0:
                raise serializers.ValidationError({
                    'credit_amount': 'Credit amount must be positive'
                })
            
            if data.get('credit_expiry_days') and (data.get('credit_expiry_days', 0) < 1 or data.get('credit_expiry_days', 0) > 365):
                raise serializers.ValidationError({
                    'credit_expiry_days': 'Credit expiry days must be between 1 and 365'
                })
        
        # Date validation
        valid_from = data.get('valid_from')
        valid_to = data.get('valid_to')
        if valid_from and valid_to and valid_from >= valid_to:
            raise serializers.ValidationError({
                'valid_to': 'End date must be after the start date'
            })
        
        # Minimum order amount validation
        minimum_order_amount = data.get('minimum_order_amount')
        if minimum_order_amount is not None and minimum_order_amount < 0:
            raise serializers.ValidationError({
                'minimum_order_amount': 'Minimum order amount cannot be negative'
            })
        
        return data
    
    def create(self, validated_data):
        # Set default values
        if validated_data.get('offer_type') == 'credit':
            if not validated_data.get('credit_type'):
                validated_data['credit_type'] = 'fixed_amount'
            if not validated_data.get('credit_expiry_days'):
                validated_data['credit_expiry_days'] = 30
        
        if 'minimum_order_amount' not in validated_data:
            validated_data['minimum_order_amount'] = 0
            
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Handle minimum order amount default
        if 'minimum_order_amount' not in validated_data:
            validated_data['minimum_order_amount'] = instance.minimum_order_amount or 0
            
        return super().update(instance, validated_data)