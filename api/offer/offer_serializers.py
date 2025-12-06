# serializers.py
from rest_framework import serializers
from api.models import OfferDetail
from api.serializers import RestaurantMasterSerializer
from django.core.exceptions import ValidationError
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

def validate_offer_payload(data, is_update=False, instance=None, user=None):
    """
    Universal validation function for OfferDetail.
    Works for:
        - coupon_code
        - free_delivery
        - auto_discount
        - restaurant_deal
        - credit
    """

    offer_type = data.get('offer_type') or (instance.offer_type if instance else None)
    sub_filter = data.get('sub_filter') or (instance.sub_filter if instance else None)

    errors = {}

    # --------------------------------------
    # BASIC OFFER TYPE CHECK
    # --------------------------------------
    if not offer_type:
        errors['offer_type'] = "Offer type is required"

    # --------------------------------------
    # COUPON CODE VALIDATION
    # --------------------------------------
    if offer_type == 'coupon_code':
        code = data.get('code') or (instance.code if instance else None)

        if not code:
            errors['code'] = "Coupon code is required"
        elif len(code) > 20:
            errors['code'] = "Coupon code cannot exceed 20 characters"

    # --------------------------------------
    # RESTAURANT VALIDATION
    # --------------------------------------
    if offer_type == 'restaurant_deal' and not data.get('restaurant'):
        errors['restaurant'] = "Restaurant is required for restaurant deals"

    if sub_filter == 'specific_restaurant' and not data.get('restaurant'):
        errors['restaurant'] = "Restaurant required when sub_filter is specific_restaurant"

    # Non-admin users must provide restaurant
    if user and getattr(user, 'role', None) != 2:
        if not instance and not data.get('restaurant'):
            errors['restaurant'] = "Restaurant is required for restaurant users"

    # --------------------------------------
    # DISCOUNT VALIDATION (common for coupon, auto_discount, credit)
    # --------------------------------------
    discount_required_types = ['coupon_code', 'auto_discount', 'credit']
    if offer_type in discount_required_types:
        discount_type = data.get('discount_type') or (instance.discount_type if instance else None)
        discount_value = data.get('discount_value') or (instance.discount_value if instance else None)

        if not discount_type:
            errors['discount_type'] = "Discount type is required"

        if not discount_value:
            errors['discount_value'] = "Discount value is required"
        else:
            if discount_type == 'percentage' and float(discount_value) > 100:
                errors['discount_value'] = "Percentage discount cannot exceed 100%"

    # --------------------------------------
    # FREE DELIVERY VALIDATION
    # --------------------------------------
    if offer_type == 'free_delivery':

        # Minimum Amount Filter
        if sub_filter == 'minimum_amount':
            if not data.get('minimum_order_amount'):
                errors['minimum_order_amount'] = "Minimum order amount is required"

        # Location Based Filter
        if sub_filter == 'location_based':
            max_dist = data.get('max_delivery_distance')
            max_fee = data.get('max_delivery_fee')

            if not max_dist:
                errors['max_delivery_distance'] = "Maximum delivery distance is required"
            elif float(max_dist) <= 0:
                errors['max_delivery_distance'] = "Maximum delivery distance must be positive"

            if max_fee is None:
                errors['max_delivery_fee'] = "Maximum delivery fee is required"
            elif float(max_fee) < 0:
                errors['max_delivery_fee'] = "Maximum delivery fee cannot be negative"

    # --------------------------------------
    # CREDIT OFFER VALIDATION
    # --------------------------------------
    if offer_type == 'credit':
        credit_amount = data.get('credit_amount') or (instance.credit_amount if instance else None)
        credit_expiry = data.get('credit_expiry_days') or (instance.credit_expiry_days if instance else None)

        if not credit_amount and not data.get('discount_value'):
            errors['credit_amount'] = "Credit amount or discount value is required"

        if credit_amount and float(credit_amount) <= 0:
            errors['credit_amount'] = "Credit amount must be positive"

        if credit_expiry and not (1 <= int(credit_expiry) <= 365):
            errors['credit_expiry_days'] = "Credit expiry must be between 1 and 365 days"

    # --------------------------------------
    # DATE VALIDATION
    # --------------------------------------
    valid_from = data.get('valid_from')
    valid_to = data.get('valid_to')

    if valid_from and valid_to and valid_from >= valid_to:
        errors['valid_to'] = "End date must be after start date"

    # --------------------------------------
    # MINIMUM ORDER AMOUNT
    # --------------------------------------
    if data.get('minimum_order_amount') is not None:
        if float(data['minimum_order_amount']) < 0:
            errors['minimum_order_amount'] = "Minimum order amount cannot be negative"

    # --------------------------------------
    # RAISE ERRORS IF ANY
    # --------------------------------------
    if errors:
        raise ValidationError(errors)

    return True  # All validations passed
