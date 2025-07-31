from django.urls import path, re_path, include
from api.delivery import porter_views, porter_webhook
from api.delivery.porter_admin import admin_porter_orders
from api.mobile.home import HomeKitchenList
from api.payment.payment import create_order, verify_payment
from api.vendor.Coupon import CouponCreateView, CouponDeleteView, CouponDetailView, CouponListView, CouponUpdateView
from .vendor.Vendor import GetVendorWiseCounts
from .views import CustomTokenRefreshView, FetchReviewView, FetchUserList, FetchCartList, UserProfileUpdate, UserProfileView, UserRegistrationView, OTPVerificationView, UserLoginView, ContactUsView, ReactAppView, SubmitOrderReviewView
from .restaurent.registration_process import RestaurantStatusUpdate, RestaurantStoreStepOne, RestaurantStoreStepTwo, RestaurantStoreStepThree, RestaurantStoreStepFour, RestaurantByUserAPIView, RestaurantByRestauranrtAPIView, RestaurantMenueStore, RestaurantMenueList,RestaurantMenueDetails,RestaurantMenueUpdate,RestaurantMenueDelete, RestaurantListAPI, RestaurantDetailMenuView
from django.conf import settings
from django.conf.urls.static import static
from .restaurent.restaurant_order import PlaceOrderAPI, RestaurantCartAddOrRemove, RestaurantCartList, CartWithRestaurantDetails,CartWithRestaurantDetailsClear, UserDeliveryAddressCreateView, UserDeliveryAddressUpdateView, UserDeliveryAddressListCreateView, CartWithRestaurantUserUpdate, RestaurantOrderDetailsAPI
from .order.track_order import ApplyCouponOrder, GetActiveOrders, LiveLocationDetails, MarkAsPaid, OrderDetails, TrackOrder, RestaurantOrders, OrderStatusUpdate, UpdateOrderLiveLocationView
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from .views import RestaurantCategoryViewSet, OfferViewSet, trigger_background_task
from api import views
from .mobile.auth import EmailLoginVerifyOTP, MobileLoginResendOTP, MobileLoginSendOTP, MobileLoginVerifyOTP, SendEmailOTP, UserProfileUpdates

router = DefaultRouter()
router.register(r'categories', RestaurantCategoryViewSet)
router.register(r'offers', OfferViewSet, basename='offer')
router.register(r'restaurants', views.RestaurantListView, basename='restaurant')

urlpatterns = [

    # path('api/', include('your_api_urls')),

    # Mobile app Signin API
    path("api/login/send-otp/", MobileLoginSendOTP.as_view(), name="send-otp-code"),
    path("api/login/verify-otp/", MobileLoginVerifyOTP.as_view(), name="verify_otp"),
    path("api/login/resend-otp/", MobileLoginResendOTP.as_view(), name="resend-otp"),
    path('api/send-email-otp/', SendEmailOTP.as_view(), name='send_email_otp'),
    path('api/verify-email-otp/', EmailLoginVerifyOTP.as_view(), name='verify_email_otp'),
    path("api/user/personal-details-update/", UserProfileUpdates.as_view(), name="user-personal-details-update"),

    path('api/get-home-list/', HomeKitchenList.as_view(), name='get-home-list'),

    path("api/register/", UserRegistrationView.as_view(), name="user-register"),
    path("api/verify-otp/", OTPVerificationView.as_view(), name="verify-otp"),
    path("api/login/", UserLoginView.as_view(), name="user-login"),
    path("api/user/", UserProfileView.as_view(), name="user-profile"), 
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='custom_token_refresh'),

    path("api/contact-us/", ContactUsView.as_view(), name="contact-us"), 
    path("api/user-profile-update/", UserProfileUpdate.as_view(), name="user-profile-update"), 

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
    path('api/restaurant/status-update/<str:restaurant_id>/', RestaurantStatusUpdate.as_view(), name='restaurant-status-update'),

    path('api/restaurant/live/list/', RestaurantListAPI.as_view(), name='restaurant-live-list'),
    
    path(
        'api/restaurant/menu/list/<str:restaurant_id>/<str:offer>/',
        RestaurantDetailMenuView.as_view(),
        name='restaurant-menu-detail-with-offer'
    ),
    path(
        'api/restaurant/menu/list/<str:restaurant_id>/',
        RestaurantDetailMenuView.as_view(),
        name='restaurant-menu-detail'
    ),

    path('api/restaurant/cart/add/', RestaurantCartAddOrRemove.as_view(), name='restaurant-cart-add'),
    path('api/restaurant/cart/list/', RestaurantCartList.as_view(), name='restaurant-cart-list'),
    path('api/restaurant/cart/details/', CartWithRestaurantDetails.as_view(), name='restaurant-cart-details'),
    path('api/restaurant/cart/clear/', CartWithRestaurantDetailsClear.as_view(), name='restaurant-cart-clear'),
    path('api/restaurant/cart/user/update/', CartWithRestaurantUserUpdate.as_view(), name='restaurant-cart-user_update'),

    path("api/user_address/store/", UserDeliveryAddressCreateView.as_view(), name="create_address"),
    path("api/user_address/update/<int:pk>/", UserDeliveryAddressUpdateView.as_view(), name="update_address"),
    path("api/addresses/list/", UserDeliveryAddressListCreateView.as_view(), name="address-list-create"),
    path("api/restaurant/order/details/", RestaurantOrderDetailsAPI.as_view(), name="restaurant-order-details"),
    path("api/restaurant/order/details/update/", PlaceOrderAPI.as_view(), name="restaurant-order-details-update"),
    
    path('api/restaurant/order/create-order/', create_order, name='create_order'),
    path('api/restaurant/order/verify-payment/', verify_payment, name='verify_payment'),

    path('api/order/track-order-details/', TrackOrder.as_view(), name='track_order_details'),
    path('api/restaurant/orders/details', RestaurantOrders.as_view(), name='restaurant_orders_details'),
    path('api/order/update-order-status/', OrderStatusUpdate.as_view(), name='order_status_update'),

    path('api/order/order-details/', OrderDetails.as_view(), name='order_details'),
    path('api/restaurant/order/mark-paid/<str:order_number>/', MarkAsPaid.as_view(), name='marked_order_as_paid'),
    path('api/order/live-location-details/', LiveLocationDetails.as_view(), name='live_location'),

    path("api/order/update-location/", UpdateOrderLiveLocationView.as_view(), name="update_order_location"),
    path("api/order/active-orders/", GetActiveOrders.as_view(), name="get_active_orders"),

    path("api/order/vendor-dashboard-details/", GetVendorWiseCounts.as_view(), name="get_active_orders"),
    path("api/order/apply-coupen-order/", ApplyCouponOrder.as_view(), name="apply-coupen-order"),

    # path('api/vendor/coupons/create/', CouponCreateView.as_view(), name='coupon-create'),     
    # path('api/vendor/coupons/', CouponListView.as_view(), name='coupon-list'),                 
    # path('api/vendor/coupons/<int:pk>/', CouponDetailView.as_view(), name='coupon-detail'),    
    # path('api/vendor/coupons/<int:pk>/update/', CouponUpdateView.as_view(), name='coupon-update'),  
    # path('api/vendor/coupons/<int:pk>/delete/', CouponDeleteView.as_view(), name='coupon-delete'),
    
    path('api/order-review/update/', SubmitOrderReviewView.as_view(), name='submit-order-review'),
    path('api/customer-review/', FetchReviewView.as_view(), name='fetch-review'),

    # porter api service
    path('api/porter/locations/', porter_views.porter_locations),
    path('api/porter/fare-estimate/', porter_views.porter_fare_estimate),
    path('api/porter/create-booking/', porter_views.porter_create_booking),
    path('api/porter/track-booking/<str:booking_id>/', porter_views.porter_track_booking),
    path('api/porter/cancel-booking/<str:booking_id>/', porter_views.porter_cancel_booking),
    path('api/porter/webhook/', porter_webhook.porter_webhook),
    path('api/porter-orders/', admin_porter_orders),
    path('api/', include(router.urls)),


    path('api/user/user_list/', FetchUserList.as_view()),
    path('api/cart/cart_list/', FetchCartList.as_view()),
    path('api/test/', trigger_background_task),

    re_path(r'^(?!media/).*$', ReactAppView.as_view(), name='react-app'),


]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)