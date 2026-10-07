import json
import logging

from django.conf import settings
from django.db.models import Sum
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reservations.models import ReservationModel

from . import fedapay, paypal, services, tarifs
from .models import ProfilVersementModel, VersementModel
from .operateurs import PAYS, operateurs_du_pays

logger = logging.getLogger('apps.paiements')


class ConfigView(APIView):
    """Ce que le frontend doit savoir pour afficher le paiement (public)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({
            'actif': services.paiement_actif(),
            # Moyens proposés au voyageur : mobile_money et carte (FedaPay), paypal (en euros)
            'moyens': services.moyens_actifs(),
            'fcfa_par_euro': float(paypal.FCFA_PAR_EURO),
            'environnement': settings.FEDAPAY['ENV'],
            'frais_voyageur': float(tarifs.FRAIS_VOYAGEUR),
            'commission_hote': float(tarifs.COMMISSION_HOTE),
            'delai_paiement_minutes': settings.FEDAPAY['EXPIRATION_MINUTES'],
            'pays': [
                {'code': code, 'nom': p['nom'], 'indicatif': p['indicatif'], 'chiffres': p['chiffres'],
                 'operateurs': [{'code': c, 'nom': n} for c, n in p['operateurs']]}
                for code, p in PAYS.items()
            ],
        })


def _reservation_du_voyageur(pk, user):
    return ReservationModel.objects.select_related('hebergement', 'guest').filter(pk=pk, guest=user).first()


class PayerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        reservation = _reservation_du_voyageur(pk, request.user)
        if not reservation:
            return Response({'detail': 'Réservation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        moyen = request.data.get('moyen') or reservation.payment_method
        try:
            url = services.demarrer_paiement(reservation, moyen)
        except services.PaiementErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'url': url})


class StatutView(APIView):
    """Interrogé par la page de retour après paiement : relit la transaction chez FedaPay si besoin."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        reservation = _reservation_du_voyageur(pk, request.user)
        if not reservation:
            return Response({'detail': 'Réservation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        dernier = reservation.paiements.order_by('-cree_le').first()
        if dernier and dernier.statut == 'en_attente':
            services.synchroniser_paiement(dernier)
            reservation.refresh_from_db()
        return Response({
            'reservation': reservation.status,
            'paiement': dernier.statut if dernier else None,
            'expire_le': reservation.expire_le,
            'annule_par': reservation.annule_par,
        })


@method_decorator(csrf_exempt, name='dispatch')
class WebhookFedaPayView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        corps = request.body
        secret = settings.FEDAPAY['WEBHOOK_SECRET']
        if secret and not fedapay.signature_valide(corps, request.headers.get('X-FEDAPAY-SIGNATURE', ''), secret):
            logger.warning("Webhook FedaPay rejeté : signature invalide")
            return Response({'detail': 'Signature invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            evenement = json.loads(corps or b'{}')
        except ValueError:
            return Response({'detail': 'Corps invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            services.traiter_evenement(evenement)
        except Exception:
            # 500 : FedaPay renverra l'événement plus tard
            logger.exception("Erreur pendant le traitement du webhook %s", evenement.get('name'))
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'recu': True})


# --- Hôte --------------------------------------------------------------------------------

class EstHote(IsAuthenticated):
    message = "Réservé aux hôtes."

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role in ('hote', 'admin')


class ProfilVersementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilVersementModel
        fields = ['pays', 'operateur', 'numero', 'titulaire', 'mis_a_jour_le']
        read_only_fields = ['mis_a_jour_le']

    def validate_numero(self, valeur):
        chiffres = ''.join(c for c in valeur if c.isdigit())
        return chiffres

    def validate_titulaire(self, valeur):
        valeur = ' '.join(valeur.split())
        if len(valeur) < 3:
            raise serializers.ValidationError("Indiquez le nom complet du titulaire du compte.")
        return valeur

    def validate(self, data):
        pays = data['pays']
        if data['operateur'] not in operateurs_du_pays(pays):
            raise serializers.ValidationError({'operateur': "Cet opérateur n'est pas disponible dans le pays choisi."})
        attendu = PAYS[pays]['chiffres']
        if len(data['numero']) != attendu:
            raise serializers.ValidationError({'numero': f"Le numéro doit comporter {attendu} chiffres (sans l'indicatif +{PAYS[pays]['indicatif']})."})
        return data


class ProfilVersementView(APIView):
    permission_classes = [EstHote]

    def get(self, request):
        profil = ProfilVersementModel.objects.filter(hote=request.user).first()
        return Response(ProfilVersementSerializer(profil).data if profil else None)

    def put(self, request):
        profil = ProfilVersementModel.objects.filter(hote=request.user).first()
        serializer = ProfilVersementSerializer(profil, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(hote=request.user)
        # Les versements bloqués faute de profil repartent à la prochaine passe du worker
        VersementModel.objects.filter(hote=request.user, statut__in=('planifie', 'echoue')).update(
            statut='planifie', derniere_erreur='', tentatives=0,
        )
        return Response(serializer.data)


class RevenusView(APIView):
    permission_classes = [EstHote]

    def get(self, request):
        versements = (
            VersementModel.objects.filter(hote=request.user)
            .exclude(statut='annule')
            .select_related('reservation', 'reservation__hebergement', 'reservation__guest')
            .order_by('-date_prevue')
        )

        def total(*statuts):
            return versements.filter(statut__in=statuts).aggregate(s=Sum('montant'))['s'] or 0

        return Response({
            'totaux': {
                'a_venir': total('planifie', 'echoue'),
                'en_cours': total('en_cours'),
                'verse': total('envoye'),
                'commission': versements.aggregate(s=Sum('commission'))['s'] or 0,
            },
            'profil_complet': ProfilVersementModel.objects.filter(hote=request.user).exists(),
            'versements': [
                {
                    'id': str(v.id),
                    'reservation_id': str(v.reservation_id),
                    'reference': v.reservation.reference,
                    'hebergement': v.reservation.hebergement.name,
                    'voyageur': f"{v.reservation.guest.first_name} {v.reservation.guest.last_name}".strip(),
                    'check_in': v.reservation.check_in,
                    'check_out': v.reservation.check_out,
                    'montant_brut': v.montant_brut,
                    'commission': v.commission,
                    'montant': v.montant,
                    'statut': v.statut,
                    'date_prevue': v.date_prevue,
                    'envoye_le': v.envoye_le,
                    'probleme': v.derniere_erreur if v.statut in ('planifie', 'echoue') else '',
                }
                for v in versements[:200]
            ],
        })
