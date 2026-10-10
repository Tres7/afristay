# validation of json, deserialization et serialization
import hashlib
import re

from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import connection, transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from apps.users.domain.entities.User import UserRole

# Le rôle admin ne peut jamais être choisi à l'inscription publique
PUBLIC_ROLES = [UserRole.VOYAGEUR.value, UserRole.HOTE.value]


class RegisterSerializer(serializers.Serializer):
    email      = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name  = serializers.CharField(max_length=150)
    password   = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True)
    role       = serializers.ChoiceField(choices=PUBLIC_ROLES, default=UserRole.VOYAGEUR.value)
    phone      = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Le prénom est requis.')
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Le nom est requis.')
        return value

    def validate_phone(self, value):
        if not value:
            return None
        cleaned = re.sub(r'[\s.\-()]', '', value)
        if cleaned.startswith('00'):
            cleaned = '+' + cleaned[2:]
        if not re.match(r'^\+\d{8,15}$', cleaned):
            raise serializers.ValidationError(
                'Numéro invalide. Utilisez le format international, ex : +228 90 00 00 00.'
            )
        return cleaned

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        try:
            validate_password(data['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return data


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    code     = serializers.RegexField(r'^\d{6}$', error_messages={'invalid': 'Le code contient 6 chiffres.'})
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        try:
            validate_password(data['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return data


class RefreshWithGracePeriodSerializer(TokenRefreshSerializer):
    """Rotation avec liste noire, et délai de grâce pour les renouvellements parallèles du même jeton.

    Le premier appel renouvelle la paire et met l'ancien refresh token sur liste noire. Pendant
    JWT_REFRESH_GRACE_SECONDS, l'ancien jeton renvoie cette même nouvelle paire au lieu d'un 401 ;
    ensuite il est refusé. Les appels simultanés sont sérialisés par un verrou PostgreSQL : la liste noire
    et le cache (DatabaseCache) sont validés dans la même transaction, l'appel suivant trouve donc la paire.
    """

    def validate(self, attrs):
        empreinte = hashlib.sha256(attrs['refresh'].encode()).digest()
        cle = f'jwt_refresh_grace:{empreinte.hex()}'
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_xact_lock(%s)', [int.from_bytes(empreinte[:8], 'big', signed=True)])
            deja_renouvele = cache.get(cle)
            if deja_renouvele is not None:
                return deja_renouvele
            data = super().validate(attrs)
            cache.set(cle, data, timeout=settings.JWT_REFRESH_GRACE_SECONDS)
            return data

