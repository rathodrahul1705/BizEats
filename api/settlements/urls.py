from django.urls import path
from .views import (
    SettlementDashboardView,
    SettlementTransactionsView,
    SettlementExportView,
    SettlementTransactionDetailView,
)

urlpatterns = [
    path('partner/settlements/dashboard/', SettlementDashboardView.as_view(), name='settlement-dashboard'),
    path('partner/settlements/transactions/', SettlementTransactionsView.as_view(), name='settlement-transactions'),
    path('partner/settlements/export/', SettlementExportView.as_view(), name='settlement-export'),
    path('partner/settlements/transactions/<str:transaction_id>/', SettlementTransactionDetailView.as_view(), name='settlement-transaction-detail'),
]