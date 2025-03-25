from django.urls import path
from .views import UserProfileView, UserRegistrationView, OTPVerificationView, UserLoginView
from .restaurent.registration_process import RestaurantStoreStepOne, RestaurantStoreStepTwo, RestaurantStoreStepThree, RestaurantStoreStepFour, RestaurantByUserAPIView, RestaurantByRestauranrtAPIView, RestaurantMenueStore, RestaurantMenueList,RestaurantMenueDetails,RestaurantMenueUpdate,RestaurantMenueDelete, RestaurantListAPI, RestaurantDetailMenuView
from django.conf import settings
from django.conf.urls.static import static
from .restaurent.restaurant_order import RestaurantCartAddOrRemove, RestaurantCartList, CartWithRestaurantDetails,CartWithRestaurantDetailsClear, UserDeliveryAddressCreateView, UserDeliveryAddressUpdateView, UserDeliveryAddressListCreateView, CartWithRestaurantUserUpdate

urlpatterns = [
    path("api/register/", UserRegistrationView.as_view(), name="user-register"),
    path("api/verify-otp/", OTPVerificationView.as_view(), name="verify-otp"),
    path("api/login/", UserLoginView.as_view(), name="user-login"),
    path("api/user/", UserProfileView.as_view(), name="user-profile"), 

    path("api/restaurant/store/step-one/", RestaurantStoreStepOne.as_view(), name="restaurant-store-step-one-no-id"),  # No ID version
    path("api/restaurant/store/step-one/<str:restaurant_id>/", RestaurantStoreStepOne.as_view(), name="restaurant-store-step-one"),
    
    path("api/restaurant/store/step-two/", RestaurantStoreStepTwo.as_view(), name="restaurant-store-step-two-no-id"),
    path("api/restaurant/store/step-two/<str:restaurant_id>/", RestaurantStoreStepTwo.as_view(), name="restaurant-store-step-two"),
    
    path("api/restaurant/store/step-three/", RestaurantStoreStepThree.as_view(), name="restaurant-store-step-three-no-id"),
    path("api/restaurant/store/step-three/<str:restaurant_id>/", RestaurantStoreStepThree.as_view(), name="restaurant-store-step-three"),
    
    path("api/restaurant/store/step-four/", RestaurantStoreStepFour.as_view(), name="restaurant-store-step-four-no-id"),
    path("api/restaurant/store/step-four/<str:restaurant_id>/", RestaurantStoreStepFour.as_view(), name="restaurant-store-step-four"),
    
    path("api/restaurants/status/<int:user_id>/", RestaurantByUserAPIView.as_view(), name="restaurants-by-user"),
    path('api/restaurant/<str:restaurant_id>/', RestaurantByRestauranrtAPIView.as_view(), name='restaurant-detail'),

    path('api/restaurant/menue/store/<str:restaurant_id>/', RestaurantMenueStore.as_view(), name='restaurant-menue-store'),
    path('api/restaurant/menue/list/<str:restaurant_id>/', RestaurantMenueList.as_view(), name='restaurant-menue-store'),
    path('api/restaurant/menue/details/<str:menu_id>/', RestaurantMenueDetails.as_view(), name='restaurant-menue-details'),
    path('api/restaurant/menue/update/<str:menu_id>/<str:restaurant_id>/', RestaurantMenueUpdate.as_view(), name='restaurant-menue-update'),
    path('api/restaurant/menue/delete/<str:menu_id>/<str:restaurant_id>/', RestaurantMenueDelete.as_view(), name='restaurant-menue-delete'),

    path('api/restaurant/live/list/', RestaurantListAPI.as_view(), name='restaurant-live-list'),
    path('api/restaurant/menu/list/<str:restaurant_id>/', RestaurantDetailMenuView.as_view(), name='restaurant-menu-detail'),

    path('api/restaurant/cart/add/', RestaurantCartAddOrRemove.as_view(), name='restaurant-cart-add'),
    path('api/restaurant/cart/list/', RestaurantCartList.as_view(), name='restaurant-cart-list'),
    path('api/restaurant/cart/details/', CartWithRestaurantDetails.as_view(), name='restaurant-cart-details'),
    path('api/restaurant/cart/clear/', CartWithRestaurantDetailsClear.as_view(), name='restaurant-cart-clear'),
    path('api/restaurant/cart/user/update/', CartWithRestaurantUserUpdate.as_view(), name='restaurant-cart-user_update'),

    path("api/user_address/store/", UserDeliveryAddressCreateView.as_view(), name="create_address"),
    path("api/user_address/update/<int:pk>/", UserDeliveryAddressUpdateView.as_view(), name="update_address"),
    path("api/addresses/list/", UserDeliveryAddressListCreateView.as_view(), name="address-list-create"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)