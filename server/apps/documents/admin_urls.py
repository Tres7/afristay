"""Routes du back-office, montées sous /api/v1/admin/documents/."""
from django.urls import path

from .views import FacturePdfView, FacturesView, SocieteView

urlpatterns = [
    path('societe/', SocieteView.as_view(), name='documents-societe'),
    path('factures/', FacturesView.as_view(), name='documents-factures'),
    path('factures/<uuid:pk>/pdf/', FacturePdfView.as_view(), name='documents-facture-pdf'),
]
