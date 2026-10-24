"""Complaint form of the help centre (CGV, art. 21.1): one email to the contact address, nothing stored.

The email is sent to ASSISTANCE_CONTACT (info@kwa-ba.com) with the customer's address as Reply-To, so the team
answers directly. The acknowledgement is shown on screen by the website.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMessage
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.securite import captcha

logger = logging.getLogger('apps.securite')

TAILLE_MAX = 5 * 1024 * 1024  # 5 Mo
TYPES_ACCEPTES = {'image/jpeg', 'image/png', 'image/webp', 'application/pdf'}
OBJETS = {
    'reservation': 'Réservation',
    'paiement': 'Paiement ou remboursement',
    'logement': 'Logement',
    'transfert': 'Transfert ou location de voiture',
    'compte': 'Compte',
    'autre': 'Autre',
}


class ReclamationSerializer(serializers.Serializer):
    objet = serializers.ChoiceField(choices=list(OBJETS))
    reservation = serializers.CharField(max_length=40, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    description = serializers.CharField(min_length=20, max_length=4000)
    piece_jointe = serializers.FileField(required=False, allow_null=True)

    def validate_piece_jointe(self, fichier):
        if fichier is None:
            return None
        if fichier.size > TAILLE_MAX:
            raise serializers.ValidationError('La pièce jointe ne doit pas dépasser 5 Mo.')
        if fichier.content_type not in TYPES_ACCEPTES:
            raise serializers.ValidationError('Pièce jointe acceptée : photo (JPEG, PNG, WebP) ou PDF.')
        return fichier

    def validate(self, data):
        user = self.context['request'].user
        if user.is_authenticated:
            data['email'] = user.email
        elif not data.get('email'):
            raise serializers.ValidationError({'email': 'Indiquez votre adresse email pour recevoir la réponse.'})
        return data


class ReclamationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'reclamation'

    def post(self, request):
        if not request.user.is_authenticated and not captcha.valide(request.data.get('captcha')):
            return Response({'detail': captcha.MESSAGE, 'code': 'captcha'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ReclamationSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        user = request.user
        nom = user.get_full_name().strip() if user.is_authenticated else ''
        corps = '\n'.join([
            f"Objet : {OBJETS[d['objet']]}",
            f"Réservation : {d.get('reservation') or 'non indiquée'}",
            f"Client : {nom + ' ' if nom else ''}<{d['email']}>{' (compte Kwa-Ba)' if user.is_authenticated else ''}",
            '',
            d['description'],
        ])
        email = EmailMessage(
            subject=f"Réclamation : {OBJETS[d['objet']]}" + (f" ({d['reservation']})" if d.get('reservation') else ''),
            body=corps, from_email=settings.DEFAULT_FROM_EMAIL, to=[settings.ASSISTANCE_CONTACT], reply_to=[d['email']],
        )
        if d.get('piece_jointe'):
            fichier = d['piece_jointe']
            email.attach(fichier.name, fichier.read(), fichier.content_type)
        try:
            email.send()
        except Exception:
            logger.exception('Réclamation : envoi impossible')
            return Response({'detail': "L'envoi a échoué. Réessayez ou écrivez-nous directement par email."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'envoye': True}, status=status.HTTP_201_CREATED)
