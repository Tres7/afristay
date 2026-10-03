"""
URL configuration for AfriStay project.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.users.infrastructure.http.routes.urls')),
    path('api/v1/hebergements/', include('apps.hebergements.urls')),
    path('api/v1/reservations/', include('apps.reservations.urls')),
    path('api/v1/favoris/', include('apps.favoris.urls')),
    path('api/v1/conversations/', include('apps.messaging.urls')),
]
