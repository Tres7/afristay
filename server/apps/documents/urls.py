from django.urls import path

from .views import DocumentView

urlpatterns = [
    path('<str:type_objet>/<uuid:pk>/<str:document>/', DocumentView.as_view(), name='documents-document'),
]
