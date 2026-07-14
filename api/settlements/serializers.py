from rest_framework import serializers
from api.models import (
    RestaurantMaster, RestaurantLocation, RestaurantOwnerDetail,
    Order, Payment, Settlement, SettlementOrder, User, UserDeliveryAddress, RestaurantMenu
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

class SettlementOrderSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = SettlementOrder
        fields = ['order_number', 'order_amount', 'commission', 'payable']


class SettlementExportSerializer(serializers.Serializer):
    filter = serializers.ChoiceField(choices=['today', 'this_week', 'last_week', 'this_month', 'last_month', 'custom'])
    start_date = serializers.CharField(required=False, allow_blank=True)
    end_date = serializers.CharField(required=False, allow_blank=True)
    restaurant_id = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    format = serializers.ChoiceField(choices=['csv'], default='csv')
    timezone = serializers.CharField(required=False, default='Asia/Kolkata')

    def validate(self, data):
        if data['filter'] == 'custom' and not (data.get('start_date') and data.get('end_date')):
            raise serializers.ValidationError("start_date and end_date required for custom filter")
        return data

class SettlementItemSerializer(serializers.ModelSerializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    total_orders = serializers.IntegerField()
    settlement_file = serializers.ImageField()
    item_gross_sale = serializers.DecimalField(source='item_gross_sales', max_digits=12, decimal_places=2)
    gross_sale = serializers.DecimalField(source='gross_sales', max_digits=12, decimal_places=2)
    total_delivery_fee = serializers.DecimalField(source='delivery_charge', max_digits=12, decimal_places=2)
    tax = serializers.DecimalField(source='taxes', max_digits=12, decimal_places=2)
    eatoor_commission = serializers.DecimalField(source='commission', max_digits=12, decimal_places=2)
    restaurant_net_pay = serializers.DecimalField(source='payable_amount', max_digits=12, decimal_places=2)
    average_order_value = serializers.SerializerMethodField()
    settlement_id = serializers.CharField(source='settlement_number')
    status = serializers.SerializerMethodField()
    restaurant_name = serializers.CharField(source='restaurant.restaurant_name')

    class Meta:
        model = Settlement
        fields = [
            'total_orders', 'item_gross_sale', 'gross_sale',
            'total_delivery_fee', 'tax', 'eatoor_commission',
            'restaurant_net_pay', 'average_order_value',
            'settlement_id', 'status', 'restaurant_name',
            'start_date','payout_date','end_date','settlement_file'
        ]

    def get_average_order_value(self, obj):
        if obj.total_orders > 0:
            return round(obj.gross_sales / obj.total_orders, 2)
        return 0.00

    def get_status(self, obj):
        return obj.status

class SettlementTotalsSerializer(serializers.Serializer):
    total_orders = serializers.IntegerField()
    item_gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_sale = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_delivery_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_tax = serializers.DecimalField(max_digits=12, decimal_places=2)
    eatoor_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    restaurant_net_pay = serializers.DecimalField(max_digits=12, decimal_places=2)

class RestaurantInfoSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='restaurant_id')
    name = serializers.CharField(source='restaurant_name')
    address = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantMaster
        fields = ['id', 'name', 'address', 'phone', 'email', 'profile_image']

    def get_address(self, obj):
        if hasattr(obj, 'restaurant_location'):
            loc = obj.restaurant_location
            parts = [p for p in [loc.area_sector_locality, loc.city, loc.zip_code] if p]
            return ', '.join(parts)
        return ""

    def get_phone(self, obj):
        if hasattr(obj, 'owner_details'):
            return obj.owner_details.owner_primary_contact or obj.owner_details.owner_contact
        return ""

    def get_email(self, obj):
        if hasattr(obj, 'owner_details'):
            return obj.owner_details.owner_email_address
        return ""

    def get_profile_image(self, obj):
        request = self.context.get('request')
        if obj.profile_image and hasattr(obj.profile_image, 'url'):
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None