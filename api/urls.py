from django.urls import path
from .views import UserProfileView, UserRegistrationView, OTPVerificationView, UserLoginView
from .restaurent.registration_process import RestaurantStoreStepOne, RestaurantStoreStepTwo, RestaurantStoreStepThree, RestaurantStoreStepFour, RestaurantByUserAPIView, RestaurantByRestauranrtAPIView

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

]