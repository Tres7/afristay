from rest_framework import serializers
from datetime import timedelta

from django.utils import timezone

from .models import BlocageModel, HebergementModel

AMENITIES = ['piscine', 'wifi', 'clim', 'parking', 'cuisine', 'jardin', 'gym', 'spa']


class HebergementSerializer(serializers.ModelSerializer):
    host_id = serializers.UUIDField(source='host.id', read_only=True)
    host_name = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = HebergementModel
        fields = [
            'id', 'name', 'description', 'type', 'city', 'location',
            'price_per_night', 'rating', 'review_count', 'image_url', 'images',
            'max_guests', 'amenities', 'is_available', 'host_id', 'host_name',
            'is_favorite', 'created_at',
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'host_id', 'created_at']

    def get_host_name(self, obj):
        return f"{obj.host.first_name} {obj.host.last_name}".strip()

    def get_is_favorite(self, obj):
        favorite_ids = self.context.get('favorite_ids')
        if favorite_ids is None:
            return False
        return obj.id in favorite_ids


class HebergementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HebergementModel
        fields = [
            'name', 'description', 'type', 'city', 'location',
            'price_per_night', 'image_url', 'images', 'max_guests',
            'amenities', 'is_available',
        ]

    def validate_price_per_night(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le prix doit être supérieur à 0.")
        return value

    def validate_max_guests(self, value):
        # À 0, plus aucune réservation n'est possible (au moins 1 voyageur par réservation)
        if value < 1:
            raise serializers.ValidationError("Le logement doit accueillir au moins 1 voyageur.")
        return value

    def validate_amenities(self, value):
        unknown = [a for a in value if a not in AMENITIES]
        if unknown:
            raise serializers.ValidationError(f"Équipements inconnus : {', '.join(unknown)}")
        return value

    def validate_images(self, value):
        if not isinstance(value, list) or not all(isinstance(u, str) for u in value):
            raise serializers.ValidationError("Liste d'URL attendue.")
        return value[:10]


class BlocageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlocageModel
        fields = ['id', 'debut', 'fin', 'motif', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        today = timezone.localdate()
        if data['fin'] <= data['debut']:
            raise serializers.ValidationError({'fin': 'La fin doit être après le début.'})
        if data['debut'] < today:
            raise serializers.ValidationError({'debut': 'Impossible de bloquer des dates passées.'})
        if data['fin'] > today + timedelta(days=730):
            raise serializers.ValidationError({'fin': 'Le calendrier est limité à deux ans.'})
        return data


class RechercheSerializer(serializers.Serializer):
    """Paramètres de recherche dont une valeur invalide ferait échouer la requête SQL (500 au lieu de 400).

    Un paramètre vide est ignoré, comme un paramètre absent.
    """
    price_min = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    price_max = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    check_in = serializers.DateField(required=False)
    check_out = serializers.DateField(required=False)

    @classmethod
    def depuis(cls, query_params):
        return cls(data={nom: valeur for nom, valeur in query_params.items() if nom in cls._declared_fields and valeur})
