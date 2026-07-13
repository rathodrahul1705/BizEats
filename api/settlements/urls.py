from django.urls import path
from .views import (
    AdminSettlementStatusUpdate,
    SettlementDashboardView,
    SettlementTransactionsView,
    SettlementExportView,
    SettlementTransactionDetailView,
    AdminSettlementDashboardView,
    AdminSettlementTransactionsView,
    AdminSettlementExportView
)

urlpatterns = [
    path('partner/settlements/dashboard/', SettlementDashboardView.as_view(), name='settlement-dashboard'),
    path('partner/settlements/transactions/', SettlementTransactionsView.as_view(), name='settlement-transactions'),
    path('partner/settlements/export/', SettlementExportView.as_view(), name='settlement-export'),
    path('partner/settlements/transactions/<str:transaction_id>/', SettlementTransactionDetailView.as_view(), name='settlement-transaction-detail'),


    path('admin/settlements/dashboard/', AdminSettlementDashboardView.as_view(), name='settlement-dashboard'),
    path('admin/settlements/transactions/', AdminSettlementTransactionsView.as_view(), name='settlement-transactions'),
    path('admin/settlements/export/', AdminSettlementExportView.as_view(), name='settlement-export'),
    path('admin/settlements/transactions/status/update/', AdminSettlementStatusUpdate.as_view(), name='settlement-status-update'),
]


