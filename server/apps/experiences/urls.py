from django.urls import path

from .views import ExperiencesView

urlpatterns = [
    path('', ExperiencesView.as_view(), name='experiences'),
]
