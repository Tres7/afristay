from rest_framework import serializers
from .models import HebergementModel

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

    def validate_amenities(self, value):
        unknown = [a for a in value if a not in AMENITIES]
        if unknown:
            raise serializers.ValidationError(f"Équipements inconnus : {', '.join(unknown)}")
        return value

    def validate_images(self, value):
        if not isinstance(value, list) or not all(isinstance(u, str) for u in value):
            raise serializers.ValidationError("Liste d'URL attendue.")
        return value[:10]
