from rest_framework import serializers
from .models import HebergementModel


class HebergementSerializer(serializers.ModelSerializer):
    host_id = serializers.UUIDField(source='host.id', read_only=True)

    class Meta:
        model = HebergementModel
        fields = [
            'id', 'name', 'description', 'type', 'city', 'location',
            'price_per_night', 'rating', 'review_count', 'image_url',
            'amenities', 'is_available', 'host_id', 'created_at',
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'host_id', 'created_at']


class HebergementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HebergementModel
        fields = [
            'name', 'description', 'type', 'city', 'location',
            'price_per_night', 'image_url', 'amenities',
        ]
