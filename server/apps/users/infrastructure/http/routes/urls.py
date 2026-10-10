from django.urls import path
from apps.users.infrastructure.http.controllers.AuthController import (
    RegisterView, LoginView, GoogleAuthView, VerifyEmailView, ResendCodeView,
    PasswordResetRequestView, PasswordResetConfirmView, RefreshView,
)
from apps.users.infrastructure.http.controllers.UserController import MeView

urlpatterns = [
    path('auth/register/',    RegisterView.as_view(),    name='auth-register'),
    path('auth/login/',       LoginView.as_view(),       name='auth-login'),
    path('auth/refresh/',     RefreshView.as_view(),     name='token-refresh'),
    path('auth/verify/',      VerifyEmailView.as_view(), name='auth-verify'),
    path('auth/resend-code/', ResendCodeView.as_view(),  name='auth-resend-code'),
    path('users/me/',         MeView.as_view(),          name='user-me'),
    path('auth/google/',      GoogleAuthView.as_view(),  name='auth-google'),
    path('auth/password-reset/',         PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
]



