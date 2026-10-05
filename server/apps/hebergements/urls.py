from django.urls import path
from .views import (
    HebergementListView, HebergementDetailView, MyHebergementsView, CityListView,
    PhotoUploadView, PhotoDetailView,
)

urlpatterns = [
    path('', HebergementListView.as_view(), name='hebergement-list'),
    path('mine/', MyHebergementsView.as_view(), name='hebergement-mine'),
    path('villes/', CityListView.as_view(), name='hebergement-villes'),
    path('photos/', PhotoUploadView.as_view(), name='hebergement-photo-upload'),
    path('photos/<uuid:pk>/', PhotoDetailView.as_view(), name='hebergement-photo-detail'),
    path('<uuid:pk>/', HebergementDetailView.as_view(), name='hebergement-detail'),
]
