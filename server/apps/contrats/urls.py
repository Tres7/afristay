from django.urls import path

from . import views

urlpatterns = [
    path('signature/<str:jeton>/', views.SignaturePubliqueView.as_view(), name='contrats-signature'),
    path('signature/<str:jeton>/pdf/', views.SignaturePubliquePdfView.as_view(), name='contrats-signature-pdf'),
    path('signature/<str:jeton>/signer/', views.SignerPubliqueView.as_view(), name='contrats-signer'),
    path('hote/', views.ContratHoteView.as_view(), name='contrats-hote'),
    path('hote/signer/', views.SignerHoteView.as_view(), name='contrats-hote-signer'),
    path('hote/pdf/', views.ContratHotePdfView.as_view(), name='contrats-hote-pdf'),
]
