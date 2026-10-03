from django.urls import path
from .views import FavoriListCreateView, FavoriDetailView

urlpatterns = [
    path('', FavoriListCreateView.as_view(), name='favori-list'),
    path('<uuid:hebergement_id>/', FavoriDetailView.as_view(), name='favori-detail'),
]
