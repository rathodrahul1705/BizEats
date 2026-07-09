from django.urls import path
from .views import (
    SettlementDashboardView,
    SettlementTransactionsView,
    SettlementExportView,
    SettlementTransactionDetailView,
    AdminSettlementGenerateView,
    AdminSettlementPayView,
    RestaurantSettlementListView,
    RestaurantSettlementDetailView
)

urlpatterns = [
    path('partner/settlements/dashboard/', SettlementDashboardView.as_view(), name='settlement-dashboard'),
    path('partner/settlements/transactions/', SettlementTransactionsView.as_view(), name='settlement-transactions'),
    path('partner/settlements/export/', SettlementExportView.as_view(), name='settlement-export'),
    path('partner/settlements/transactions/<str:transaction_id>/', SettlementTransactionDetailView.as_view(), name='settlement-transaction-detail'),

    path('api/admin/settlement/generate/', AdminSettlementGenerateView.as_view(), name='admin-settle-generate'),
    path('api/admin/settlement/pay/', AdminSettlementPayView.as_view(), name='admin-settle-pay'),
    path('api/restaurant/settlements/', RestaurantSettlementListView.as_view(), name='rest-settle-list'),
    path('api/restaurant/settlement/<int:pk>/', RestaurantSettlementDetailView.as_view(), name='rest-settle-detail'),
]


