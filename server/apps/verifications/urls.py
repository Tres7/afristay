from django.urls import path

from .views import DecisionView, FichierPieceView, MaPieceIdentiteView, PieceDecisionView, PiecesView, VisitesView

urlpatterns = [
    path('identite/', MaPieceIdentiteView.as_view(), name='verification-identite'),
    path('identite/<uuid:user_id>/fichier/', FichierPieceView.as_view(), name='verification-identite-fichier'),
    path('identites/', PiecesView.as_view(), name='verification-identites'),
    path('identites/<uuid:user_id>/decision/', PieceDecisionView.as_view(), name='verification-identite-decision'),
    path('visites/', VisitesView.as_view(), name='verification-visites'),
    path('visites/<uuid:pk>/decision/', DecisionView.as_view(), name='verification-decision'),
]
