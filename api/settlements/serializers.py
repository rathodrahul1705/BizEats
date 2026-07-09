from rest_framework import serializers
from api.models import (
    RestaurantMaster, RestaurantLocation, RestaurantOwnerDetail,
    Order, Payment, User, UserDeliveryAddress, RestaurantMenu
)
from decimal import Decimal

# ---------- Restaurant serializer ----------
class RestaurantBriefSerializer(serializers.Serializer):
    id = serializers.CharField(source='restaurant_id')
    name = serializers.CharField(source='restaurant_name')
    address = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()   # NEW

    def get_address(self, obj):
        location = getattr(obj, 'restaurant_location', None)
        if location:
            parts = [part for part in [
                location.shop_no_building,
                location.floor_tower,
                location.area_sector_locality,
                location.city,
                location.zip_code
            ] if part]
            return ', '.join(parts)
        return ''

    def get_phone(self, obj):
        owner = getattr(obj, 'owner_details', None)
        return owner.owner_contact if owner else ''

    def get_email(self, obj):
        owner = getattr(obj, 'owner_details', None)
        return owner.owner_email_address if owner else ''

    def get_profile_image(self, obj):
        """Return absolute URL of the profile image, or None if not set."""
        request = self.context.get('request')
        if obj.profile_image and hasattr(obj.profile_image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

# ---------- Query serializers (unchanged) ----------
class SettlementDashboardQuerySerializer(serializers.Serializer):
    restaurant_id = serializers.CharField(required=True)
    filter = serializers.ChoiceField(choices=['this_week','last_week','this_month','last_month','custom'])
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    timezone = serializers.CharField(default='Asia/Kolkata', required=False)

    def validate(self, data):
        if data['filter'] == 'custom' and not (data.get('start_date') and data.get('end_date')):
            raise serializers.ValidationError("start_date and end_date are required for custom filter")
        return data

class SettlementTransactionsQuerySerializer(serializers.Serializer):
    restaurant_id = serializers.CharField(required=True)
    filter = serializers.ChoiceField(choices=['this_week','last_week','this_month','last_month','custom'])
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    timezone = serializers.CharField(default='Asia/Kolkata', required=False)
    status = serializers.ChoiceField(choices=['paid','pending','processing','failed','on_hold'], required=False)
    page = serializers.IntegerField(default=1, min_value=1)
    page_size = serializers.IntegerField(default=20, min_value=1, max_value=100)
    sort_by = serializers.ChoiceField(
        choices=['date', 'total_orders', 'gross_sales', 'net_pay'],
        default='date'
    )
    sort_order = serializers.ChoiceField(choices=['asc','desc'], default='desc')

    def validate(self, data):
        if data['filter'] == 'custom' and not (data.get('start_date') and data.get('end_date')):
            raise serializers.ValidationError("start_date and end_date are required for custom filter")
        return data

class SettlementExportBodySerializer(serializers.Serializer):
    restaurant_id = serializers.CharField(required=True)
    filter = serializers.ChoiceField(choices=['this_week','last_week','this_month','last_month','custom'])
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    format = serializers.ChoiceField(choices=['csv','xlsx','pdf'])
    timezone = serializers.CharField(default='Asia/Kolkata', required=False)

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("start_date must be before end_date")
        return data

# ---------- Response serializers (unchanged) ----------
class SettlementSummarySerializer(serializers.Serializer):
    total_orders = serializers.IntegerField()
    item_gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_delivery_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_tax = serializers.DecimalField(max_digits=12, decimal_places=2)
    eatoor_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    restaurant_net_pay = serializers.DecimalField(max_digits=12, decimal_places=2)

class SettlementCurrentCycleSerializer(serializers.Serializer):
    cycle_start_date = serializers.DateField()
    cycle_end_date = serializers.DateField()
    payout_date = serializers.DateField()
    status = serializers.CharField()
    orders = serializers.IntegerField()
    item_gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    eatoor_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    restaurant_net_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
    progress_percent = serializers.IntegerField()

class SettlementTransactionSerializer(serializers.Serializer):
    id = serializers.CharField()
    date = serializers.DateField()
    order_id = serializers.CharField()
    customer = serializers.CharField()
    order_type = serializers.CharField()
    payment_method = serializers.CharField()
    items_count = serializers.IntegerField()
    item_gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2)
    delivery_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    eatoor_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    restaurant_net_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()

class DayWiseSummarySerializer(serializers.Serializer):
    date = serializers.DateField()
    total_orders = serializers.IntegerField()
    item_gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_delivery_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2)
    eatoor_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    restaurant_net_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_order_value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)