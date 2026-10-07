from django.urls import path

from .views import ConfigView, PayerView, ProfilVersementView, RevenusView, StatutView, WebhookFedaPayView

urlpatterns = [
    path('config/', ConfigView.as_view(), name='paiements-config'),
    path('reservations/<uuid:pk>/payer/', PayerView.as_view(), name='paiements-payer'),
    path('reservations/<uuid:pk>/statut/', StatutView.as_view(), name='paiements-statut'),
    path('webhooks/fedapay/', WebhookFedaPayView.as_view(), name='paiements-webhook-fedapay'),
    path('profil-versement/', ProfilVersementView.as_view(), name='paiements-profil-versement'),
    path('revenus/', RevenusView.as_view(), name='paiements-revenus'),
]
