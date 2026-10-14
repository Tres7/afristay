from django.urls import path

from . import views

urlpatterns = [
    path('stats/', views.StatsView.as_view(), name='admin-stats'),
    path('users/', views.UtilisateurListView.as_view(), name='admin-users'),
    path('users/<uuid:pk>/', views.UtilisateurDetailView.as_view(), name='admin-user'),
    path('hebergements/', views.HebergementListView.as_view(), name='admin-hebergements'),
    path('hebergements/<uuid:pk>/', views.HebergementDetailView.as_view(), name='admin-hebergement'),
    path('reservations/', views.ReservationListView.as_view(), name='admin-reservations'),
    path('reservations/<uuid:pk>/annuler/', views.ReservationAnnulerView.as_view(), name='admin-reservation-annuler'),
    path('avis/', views.AvisListView.as_view(), name='admin-avis'),
    path('avis/<uuid:pk>/', views.AvisDetailView.as_view(), name='admin-avis-detail'),
]
