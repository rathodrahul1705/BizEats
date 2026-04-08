from django.urls import path
from api.offer_engine.offer_engine_views import dynamic_offer_api, banner_list_api

urlpatterns = [
    path('offers/', dynamic_offer_api),
    path('offers/banner/', banner_list_api),
]