from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from api.models import RestaurantMaster, Order

class PayoutSummarySerializer(serializers.Serializer):
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_settlement = serializers.DecimalField(max_digits=12, decimal_places=2)
    last_payout = serializers.DecimalField(max_digits=12, decimal_places=2)
    last_payout_date = serializers.DateField()
    next_payout_date = serializers.DateField()
    payout_method = serializers.CharField()
    account_number = serializers.CharField()
    account_holder_name = serializers.CharField(allow_null=True)
    account_type = serializers.CharField(allow_null=True)
    bank_ifsc_code = serializers.CharField(allow_null=True)
    pan_number = serializers.CharField(allow_null=True)
    fssai_number = serializers.CharField(allow_null=True)
    is_contract_checked = serializers.BooleanField()
    has_partner_contract = serializers.BooleanField()
    has_bank_details = serializers.BooleanField()
    upi_id = serializers.CharField(allow_null=True)
    wallet_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    payout_schedule = serializers.CharField()
    min_payout_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    current_cycle_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_cycle_orders = serializers.IntegerField()
    needs_account_setup = serializers.BooleanField()

class PayoutCycleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    cycle_label = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    status = serializers.CharField()
    orders = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_date = serializers.DateField(allow_null=True)
    paid_time = serializers.CharField(allow_null=True)
    bank_name = serializers.CharField(allow_null=True)
    account_last4 = serializers.CharField(allow_null=True)
    reference = serializers.CharField()

# ADDING THE MISSING DailyEarningsSerializer
class DailyEarningsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    date = serializers.DateField()
    day = serializers.CharField()
    orders = serializers.IntegerField()
    order_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    platform_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    payout_status = serializers.CharField()

class PaymentHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    method = serializers.CharField()
    reference = serializers.CharField()
    description = serializers.CharField()
    cycle = serializers.CharField()
    bank_name = serializers.CharField(allow_null=True)
    account_last4 = serializers.CharField(allow_null=True)
    upi_id = serializers.CharField(allow_null=True)

class WithdrawalOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    method = serializers.CharField()
    icon = serializers.CharField()
    daily_limit = serializers.CharField()
    processing_time = serializers.CharField()
    fee = serializers.CharField()
    min_amount = serializers.CharField()
    is_default = serializers.BooleanField()
    is_available = serializers.BooleanField()

class AccountDetailsSerializer(serializers.Serializer):
    account_number = serializers.CharField(allow_null=True)
    masked_account_number = serializers.CharField(allow_null=True)
    bank_account_ifsc_code = serializers.CharField(allow_null=True)
    bank_account_type = serializers.CharField(allow_null=True)
    bank_account_type_code = serializers.IntegerField(allow_null=True)
    pan_number = serializers.CharField(allow_null=True)
    name_as_per_pan = serializers.CharField(allow_null=True)
    fssai_number = serializers.CharField(allow_null=True)
    is_contract_checked = serializers.BooleanField()
    has_partner_contract = serializers.BooleanField()
    has_documents = serializers.BooleanField()

class PayoutDataSerializer(serializers.Serializer):
    summary = PayoutSummarySerializer()
    account_details = AccountDetailsSerializer()
    payout_cycles = PayoutCycleSerializer(many=True)
    earnings = DailyEarningsSerializer(many=True)
    payment_history = PaymentHistorySerializer(many=True)
    withdrawal_options = WithdrawalOptionSerializer(many=True)
    settlement = serializers.ListField(child=serializers.DictField())
    has_valid_account = serializers.BooleanField()