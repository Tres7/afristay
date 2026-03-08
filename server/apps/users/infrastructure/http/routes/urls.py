from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.infrastructure.http.controllers.AuthController import RegisterView, LoginView
from apps.users.infrastructure.http.controllers.UserController import MeView

urlpatterns = [
    path('auth/register', RegisterView.as_view()),
    path('auth/login',    LoginView.as_view()),
    path('auth/refresh',  TokenRefreshView.as_view()),
    path('users/me',      MeView.as_view()),
]
