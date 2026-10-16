from django.urls import path

from . import locations, transferts, views

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
    # Location de voiture
    path('location/regles/', locations.ParametresView.as_view(), name='admin-location-regles'),
    path('location/categories/', locations.CategoriesView.as_view(), name='admin-location-categories'),
    path('location/categories/<int:pk>/', locations.CategorieView.as_view(), name='admin-location-categorie'),
    path('location/lieux/', locations.LieuxView.as_view(), name='admin-location-lieux'),
    path('location/lieux/<int:pk>/', locations.LieuView.as_view(), name='admin-location-lieu'),
    path('location/loueurs/', locations.PartenairesView.as_view(), name='admin-location-loueurs'),
    path('location/loueurs/<int:pk>/', locations.PartenaireView.as_view(), name='admin-location-loueur'),
    path('location/locations/', locations.LocationsView.as_view(), name='admin-locations'),
    path('location/locations/<uuid:pk>/loueurs/', locations.LocationPartenairesView.as_view(), name='admin-location-loueurs-dispo'),
    path('location/locations/<uuid:pk>/attribuer/', locations.LocationAttribuerView.as_view(), name='admin-location-attribuer'),
    path('location/locations/<uuid:pk>/annuler/', locations.LocationAnnulerView.as_view(), name='admin-location-annuler'),
    # Transferts aéroport
    path('transferts/aeroports/', transferts.AeroportsView.as_view(), name='admin-aeroports'),
    path('transferts/aeroports/<str:pk>/', transferts.AeroportView.as_view(), name='admin-aeroport'),
    path('transferts/aeroports/<str:code>/tarifs/', transferts.TarifsView.as_view(), name='admin-aeroport-tarifs'),
    path('transferts/chauffeurs/', transferts.ChauffeursView.as_view(), name='admin-chauffeurs'),
    path('transferts/chauffeurs/<int:pk>/', transferts.ChauffeurView.as_view(), name='admin-chauffeur'),
    path('transferts/transferts/', transferts.TransfertsView.as_view(), name='admin-transferts'),
    path('transferts/transferts/<uuid:pk>/chauffeurs/', transferts.TransfertChauffeursView.as_view(), name='admin-transfert-chauffeurs'),
    path('transferts/transferts/<uuid:pk>/attribuer/', transferts.TransfertAttribuerView.as_view(), name='admin-transfert-attribuer'),
    path('transferts/transferts/<uuid:pk>/annuler/', transferts.TransfertAnnulerView.as_view(), name='admin-transfert-annuler'),
]
