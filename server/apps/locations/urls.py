from django.urls import path

from .views import (
    CatalogueView, CompteRemboursementLocationView, DevisView, LocationsView, LocationView, MesChauffeursView,
    PayerLocationView,
)

urlpatterns = [
    path('catalogue/', CatalogueView.as_view(), name='locations-catalogue'),
    path('devis/', DevisView.as_view(), name='locations-devis'),
    path('mes-chauffeurs/', MesChauffeursView.as_view(), name='locations-mes-chauffeurs'),
    path('', LocationsView.as_view(), name='locations'),
    path('<uuid:pk>/', LocationView.as_view(), name='location'),
    path('<uuid:pk>/payer/', PayerLocationView.as_view(), name='location-payer'),
    path('<uuid:pk>/compte-remboursement/', CompteRemboursementLocationView.as_view(), name='location-compte-remboursement'),
]
