from rest_framework import serializers
from api.models import Wallet, WalletTransaction


class WalletTransactionSerializer(serializers.ModelSerializer):
    order_number = serializers.SerializerMethodField()

    class Meta:
        model = WalletTransaction
        fields = [
            "id",
            "txn_type",
            "amount",
            "balance_before",
            "balance_after",
            "txn_source",
            "order",
            "order_number",
            "status",
            "note",
            "razorpay_payment_id",
            "razorpay_order_id",
            "created_at",
        ]

    def get_order_number(self, obj):
        if obj.order:
            return getattr(obj.order, "order_number", obj.order.id)
        return None


class WalletSerializer(serializers.ModelSerializer):
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = ["id", "balance", "is_active", "transactions"]
