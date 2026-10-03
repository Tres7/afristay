from rest_framework import serializers
from .models import ReservationModel
from apps.hebergements.serializers import HebergementSerializer


class ReservationSerializer(serializers.ModelSerializer):
    hebergement_detail = HebergementSerializer(source='hebergement', read_only=True)
    nights = serializers.IntegerField(read_only=True)
    reference = serializers.CharField(read_only=True)

    class Meta:
        model = ReservationModel
        fields = [
            'id', 'hebergement', 'hebergement_detail', 'check_in', 'check_out',
            'guests_count', 'total_price', 'status', 'payment_method',
            'message', 'nights', 'reference', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']


class ReservationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationModel
        fields = [
            'hebergement', 'check_in', 'check_out',
            'guests_count', 'payment_method', 'message',
        ]

    def validate(self, data):
        if data['check_in'] >= data['check_out']:
            raise serializers.ValidationError("La date de départ doit être après la date d'arrivée.")
        return data

    def create(self, validated_data):
        hebergement = validated_data['hebergement']
        nights = (validated_data['check_out'] - validated_data['check_in']).days
        service_fee = hebergement.price_per_night * nights * 8 / 100
        total_price = hebergement.price_per_night * nights + service_fee
        return ReservationModel.objects.create(total_price=total_price, **validated_data)
