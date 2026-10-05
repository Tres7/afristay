from django.urls import path
from .views import AvisALaisserView, AvisListCreateView, ReponseHoteView

urlpatterns = [
    path('', AvisListCreateView.as_view(), name='avis-list'),
    path('a-laisser/', AvisALaisserView.as_view(), name='avis-a-laisser'),
    path('<uuid:pk>/reponse/', ReponseHoteView.as_view(), name='avis-reponse'),
]
