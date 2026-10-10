"""
URL configuration for Kwa-Ba project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.users.infrastructure.http.routes.urls')),
    path('api/v1/hebergements/', include('apps.hebergements.urls')),
    path('api/v1/reservations/', include('apps.reservations.urls')),
    path('api/v1/favoris/', include('apps.favoris.urls')),
    path('api/v1/avis/', include('apps.avis.urls')),
    path('api/v1/paiements/', include('apps.paiements.urls')),
    path('api/v1/transferts/', include('apps.transferts.urls')),
    path('api/v1/voyages/', include('apps.voyages.urls')),
    path('api/v1/concierge/', include('apps.concierge.urls')),
    path('api/v1/give/', include('apps.give.urls')),
    path('api/v1/messaging/', include('apps.messaging.infrastructure.http.routes.urls')),
]

# Photos envoyées par les hôtes (en production, servies par le serveur web / un stockage objet)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
