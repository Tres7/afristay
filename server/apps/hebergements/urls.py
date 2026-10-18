from django.urls import path

from .lancement import FenetreLancementView, InscriptionLancementView
from .views import (
    HebergementListView, HebergementDetailView, MyHebergementsView, CityListView, SuggestionsView,
    PhotoUploadView, PhotoDetailView,
    DisponibiliteView, BlocageCreateView, BlocageDetailView,
)

urlpatterns = [
    path('', HebergementListView.as_view(), name='hebergement-list'),
    path('mine/', MyHebergementsView.as_view(), name='hebergement-mine'),
    path('villes/', CityListView.as_view(), name='hebergement-villes'),
    path('suggestions/', SuggestionsView.as_view(), name='hebergement-suggestions'),
    path('lancement/', InscriptionLancementView.as_view(), name='hebergement-lancement'),
    path('lancement/fenetre/', FenetreLancementView.as_view(), name='hebergement-lancement-fenetre'),
    path('photos/', PhotoUploadView.as_view(), name='hebergement-photo-upload'),
    path('photos/<uuid:pk>/', PhotoDetailView.as_view(), name='hebergement-photo-detail'),
    path('blocages/<uuid:pk>/', BlocageDetailView.as_view(), name='blocage-detail'),
    path('<uuid:pk>/', HebergementDetailView.as_view(), name='hebergement-detail'),
    path('<uuid:pk>/disponibilites/', DisponibiliteView.as_view(), name='hebergement-disponibilites'),
    path('<uuid:pk>/blocages/', BlocageCreateView.as_view(), name='hebergement-blocages'),
]
