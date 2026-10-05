from rest_framework import serializers
from .models import FavoriModel
from apps.hebergements.serializers import HebergementSerializer


class FavoriSerializer(serializers.ModelSerializer):
    hebergement_detail = HebergementSerializer(source='hebergement', read_only=True)

    class Meta:
        model = FavoriModel
        fields = ['id', 'hebergement', 'hebergement_detail', 'created_at']
        read_only_fields = ['id', 'created_at']


class FavoriCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriModel
        fields = ['hebergement']
