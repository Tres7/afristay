from django.urls import path
from .views import HebergementListView, HebergementDetailView

urlpatterns = [
    path('', HebergementListView.as_view(), name='hebergement-list'),
    path('<uuid:pk>/', HebergementDetailView.as_view(), name='hebergement-detail'),
]
