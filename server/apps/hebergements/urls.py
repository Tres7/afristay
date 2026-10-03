from django.urls import path
from .views import HebergementListView, HebergementDetailView, MyHebergementsView, CityListView

urlpatterns = [
    path('', HebergementListView.as_view(), name='hebergement-list'),
    path('mine/', MyHebergementsView.as_view(), name='hebergement-mine'),
    path('villes/', CityListView.as_view(), name='hebergement-villes'),
    path('<uuid:pk>/', HebergementDetailView.as_view(), name='hebergement-detail'),
]
