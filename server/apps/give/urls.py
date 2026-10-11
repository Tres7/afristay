from django.urls import path

from .views import ConfigView, DonsView, DonView, ImpactView, OrganisationsView, OrganisationView

urlpatterns = [
    path('config/', ConfigView.as_view(), name='give-config'),
    path('impact/', ImpactView.as_view(), name='give-impact'),
    path('organisations/', OrganisationsView.as_view(), name='give-organisations'),
    path('organisations/<slug:slug>/', OrganisationView.as_view(), name='give-organisation'),
    path('dons/', DonsView.as_view(), name='give-dons'),
    path('dons/<uuid:pk>/', DonView.as_view(), name='give-don'),
]
