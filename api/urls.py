# from django.urls import path
# from .views import home, home_page

# urlpatterns = [
#     path('api/home/', home),
#     path('', home_page),
# ]

# from django.urls import path
# from .views import register, login

# urlpatterns = [
#     path('register', register),
#     path('login', login),
# ]

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, RegisterView, UserProfileView

urlpatterns = [
    path('api/register', RegisterView.as_view(), name='register'),  # Register API
    path('api/login', CustomTokenObtainPairView.as_view(), name='login'),
    path('api/token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/user', UserProfileView.as_view(), name='user-profile'),
]

