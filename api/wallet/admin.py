from django.contrib import admin
from api.models import Wallet, WalletTransaction

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "balance", "is_active", "updated_at")
    search_fields = ("user__username", "user__email")
    list_filter = ("is_active",)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "wallet",
        "txn_type",
        "amount",
        "txn_source",
        "order",
        "status",
        "created_at",
    )
    list_filter = ("txn_type", "txn_source", "status")
    search_fields = ("wallet__user__username", "order__id", "note")
