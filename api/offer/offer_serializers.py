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
            'code',
            'discount_type',  # Fixed typo from 'discount_type' (was 'discount_type')
            'discount_value',  # Fixed typo from 'discount_value' (was 'discount_value')
            'minimum_order_amount',
            'valid_from',
            'valid_to',
            'max_uses',
            'max_uses_per_user',
            'is_active',
            'times_used',
            'restaurant',
            'restaurant_details',
            'created_at',
            'updated_at',
            'is_valid',
        ]
        extra_kwargs = {
            'restaurant': {'required': False, 'allow_null': True},
            'code': {'required': False, 'allow_null': True},
            'discount_type': {'required': False, 'allow_null': True},
            'discount_value': {'required': False, 'allow_null': True},
        }
    
    def validate(self, data):
        """Custom validation"""
        offer_type = data.get('offer_type', self.instance.offer_type if self.instance else None)
        
        # Coupon code required for coupon_code type
        if offer_type == 'coupon_code' and not data.get('code'):
            raise serializers.ValidationError({'code': 'Coupon code is required for coupon code offers'})
        
        # Restaurant required for vendor_specific type
        if offer_type == 'vendor_specific' and not data.get('restaurant'):
            raise serializers.ValidationError({'restaurant': 'Restaurant is required for vendor-specific offers'})
        
        # Discount fields required for certain types
        if offer_type in ['coupon_code', 'automatic_discount', 'first_time_user']:
            if not data.get('discount_type'):
                raise serializers.ValidationError({'discount_type': 'Discount type is required for this offer type'})
            if not data.get('discount_value'):
                raise serializers.ValidationError({'discount_value': 'Discount value is required for this offer type'})
        
        # Validity dates check
        if data.get('valid_from') and data.get('valid_to'):
            if data['valid_from'] >= data['valid_to']:
                raise serializers.ValidationError({
                    'valid_to': 'End date must be after the start date'
                })
        print("data===",data)
        return data