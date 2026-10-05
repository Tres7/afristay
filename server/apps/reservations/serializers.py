from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers
from .models import ReservationModel
from apps.hebergements.disponibilites import conflit
from apps.hebergements.serializers import HebergementSerializer

SERVICE_FEE_RATE = Decimal('0.08')


class ReservationSerializer(serializers.ModelSerializer):
    hebergement_detail = HebergementSerializer(source='hebergement', read_only=True)
    nights = serializers.IntegerField(read_only=True)
    reference = serializers.CharField(read_only=True)
    guest_name = serializers.SerializerMethodField()
    avis_id = serializers.SerializerMethodField()
    peut_evaluer = serializers.SerializerMethodField()

    class Meta:
        model = ReservationModel
        fields = [
            'id', 'hebergement', 'hebergement_detail', 'check_in', 'check_out',
            'guests_count', 'total_price', 'status', 'payment_method',
            'message', 'nights', 'reference', 'guest_name', 'avis_id', 'peut_evaluer', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def get_avis_id(self, obj):
        avis = getattr(obj, 'avis', None) if hasattr(obj, 'avis') else None
        return str(avis.id) if avis else None

    def get_peut_evaluer(self, obj):
        from apps.avis.services import motif_refus
        request = self.context.get('request')
        return bool(request and motif_refus(obj, request.user) is None)

    def get_guest_name(self, obj):
        return f"{obj.guest.first_name} {obj.guest.last_name}".strip()


class ReservationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationModel
        fields = [
            'hebergement', 'check_in', 'check_out',
            'guests_count', 'payment_method', 'message',
        ]

    def validate(self, data):
        hebergement = data['hebergement']
        check_in, check_out = data['check_in'], data['check_out']
        request = self.context.get('request')

        if check_in < timezone.localdate():
            raise serializers.ValidationError({'check_in': "La date d'arrivée ne peut pas être dans le passé."})
        if check_in >= check_out:
            raise serializers.ValidationError({'check_out': "La date de départ doit être après la date d'arrivée."})
        if (check_out - check_in).days > 90:
            raise serializers.ValidationError({'check_out': "La durée maximale d'un séjour est de 90 nuits."})
        if data.get('guests_count', 1) < 1:
            raise serializers.ValidationError({'guests_count': "Au moins 1 voyageur."})
        if data.get('guests_count', 1) > hebergement.max_guests:
            raise serializers.ValidationError(
                {'guests_count': f"Ce logement accueille au maximum {hebergement.max_guests} voyageurs."}
            )
        if not hebergement.is_available:
            raise serializers.ValidationError({'hebergement': "Cet hébergement n'est plus disponible."})
        if request and hebergement.host_id == request.user.id:
            raise serializers.ValidationError({'hebergement': "Vous ne pouvez pas réserver votre propre hébergement."})

        # Même règle que le calendrier affiché : réservations actives et dates fermées par l'hôte
        motif = conflit(hebergement.id, check_in, check_out)
        if motif:
            raise serializers.ValidationError({'check_in': motif})
        return data

    def create(self, validated_data):
        hebergement = validated_data['hebergement']
        nights = (validated_data['check_out'] - validated_data['check_in']).days
        subtotal = hebergement.price_per_night * nights
        total_price = (subtotal + subtotal * SERVICE_FEE_RATE).quantize(Decimal('1'))
        return ReservationModel.objects.create(total_price=total_price, **validated_data)
