from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.infrastructure.http.controllers.AuthController import GoogleAuthView


from apps.users.infrastructure.http.controllers.AuthController import RegisterView, LoginView
from apps.users.infrastructure.http.controllers.UserController import MeView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/',    LoginView.as_view(), name='auth-login'),
    path('auth/refresh/',  TokenRefreshView.as_view(), name='token-refresh'),
    path('users/me/',      MeView.as_view(), name='user-me'),
    path('auth/google/', GoogleAuthView.as_view(), name='auth-google'),
]



