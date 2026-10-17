from rest_framework import serializers
from .models import FavoriModel
from apps.hebergements.models import HebergementModel
from apps.hebergements.serializers import HebergementSerializer


class FavoriSerializer(serializers.ModelSerializer):
    hebergement_detail = HebergementSerializer(source='hebergement', read_only=True)

    class Meta:
        model = FavoriModel
        fields = ['id', 'hebergement', 'hebergement_detail', 'created_at']
        read_only_fields = ['id', 'created_at']


class FavoriCreateSerializer(serializers.ModelSerializer):
    # Seulement les annonces publiées (vérifiées par un agent, non masquées)
    hebergement = serializers.PrimaryKeyRelatedField(queryset=HebergementModel.objects.publiees())

    class Meta:
        model = FavoriModel
        fields = ['hebergement']
