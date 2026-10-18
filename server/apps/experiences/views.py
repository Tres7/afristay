from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ExperienceModel


def experience_json(request, e: ExperienceModel) -> dict:
    return {
        'id': e.id, 'categorie': e.categorie, 'nom': e.nom, 'nom_en': e.nom_en, 'etiquette': e.etiquette,
        'etiquette_en': e.etiquette_en, 'ville': e.ville, 'pays': e.pays, 'pays_en': e.pays_en,
        'description': e.description, 'description_en': e.description_en, 'prix': e.prix, 'gratuit': e.gratuit,
        'image': e.photo(request),
    }


class ExperiencesView(APIView):
    """GET : expériences actives de la page Découvrir (textes en français et en anglais, le client choisit)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response([experience_json(request, e) for e in ExperienceModel.objects.filter(actif=True)])
