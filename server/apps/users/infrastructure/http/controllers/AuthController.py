import secrets
from datetime import timedelta
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.securite.audit import journaliser
from apps.securite.limites import Tentatives, incrementer, limite_ip
from apps.users.application.dto.dto import GoogleAuthDTO, RegisterDTO, UserRole
from apps.users.application.service.UserService import UserService
from apps.users.application.events.UserRegistered import UserRegistered
from apps.users.application.events.PasswordResetRequested import PasswordResetRequested
from apps.users.infrastructure.persistence.DjangoUserRepository import DjangoUserRepository
from apps.users.infrastructure.messaging.FallbackEventBus import FallbackEventBus
from apps.users.infrastructure.http.serializers.auth_serializers import (
    RegisterSerializer, LoginSerializer, PasswordResetConfirmSerializer, RefreshWithGracePeriodSerializer,
)
from apps.users.domain.exceptions import UserAlreadyExistsException, UserNotFoundException
from apps.users.infrastructure.persistence.models import UserModel, VerificationCode
from apps.users.infrastructure.external.GoogleAPITokenVerifier import GoogleAPITokenVerifier

RESEND_COOLDOWN = timedelta(seconds=60)
# Essais de code (vérification d'email et réinitialisation) : un code est invalidé après MAX_ESSAIS_PAR_CODE échecs,
# et une adresse a droit à MAX_ESSAIS_PAR_HEURE essais par heure, nouveaux codes compris. Soit au plus 240 essais
# par jour sur 900 000 codes possibles.
MAX_ESSAIS_PAR_CODE = 5
MAX_ESSAIS_PAR_HEURE = 10
# Connexion : 10 essais par adresse email par quart d'heure (un succès remet le compteur à zéro)
MAX_ESSAIS_CONNEXION = 10
FENETRE_CONNEXION = 15 * 60

# Empreinte calculée une fois : comparer le mot de passe même quand le compte n'existe pas égalise le temps de
# réponse (sinon la durée révèle quelles adresses ont un compte)
_EMPREINTE_FACTICE = make_password('kwaba-compte-inexistant')

# Routes appelées directement par le navigateur : limites par adresse IP
LimiteInscription = limite_ip('inscription', 10, 3600)
LimiteCodes = limite_ip('codes', 30, 3600)
LimiteEnvoiCodes = limite_ip('envoi_codes', 10, 3600)
LimiteGoogle = limite_ip('google', 30, 60)


def _service() -> UserService:
    return UserService(DjangoUserRepository())


def _new_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _user_payload(user) -> dict:
    role = user.role.value if isinstance(user.role, UserRole) else user.role
    return {
        'id': str(user.id),
        'email': str(user.email),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': role,
        'phone': str(user.phone) if user.phone else None,
        'avatar_url': user.avatar_url,
        'is_verified': user.is_verified,
        'is_active': user.is_active,
    }


def _tokens_for(user_id) -> dict:
    refresh = RefreshToken.for_user(UserModel.objects.get(id=user_id))
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def revoquer_jetons(user_id) -> None:
    """Met sur liste noire tous les refresh tokens de l'utilisateur : toutes ses sessions sont fermées.

    Les jetons d'accès émis avant un changement de mot de passe sont refusés par CHECK_REVOKE_TOKEN.
    """
    for jeton in OutstandingToken.objects.filter(user_id=user_id).exclude(blacklistedtoken__isnull=False):
        BlacklistedToken.objects.get_or_create(token=jeton)


def _essais_code(email: str) -> Tentatives:
    return Tentatives(f"code:{email}", MAX_ESSAIS_PAR_HEURE, 3600)


def _trop_d_essais(attente: int, **extra) -> Response:
    minutes = attente // 60 + 1
    reponse = Response(
        {'detail': f"Trop de tentatives. Réessayez dans {minutes} min.", 'retry_after': attente, **extra},
        status=status.HTTP_429_TOO_MANY_REQUESTS,
    )
    reponse['Retry-After'] = str(attente)
    return reponse


def _echec_code(email: str, vc: VerificationCode | None) -> None:
    """Compte l'échec sur le code en cours : au-delà de MAX_ESSAIS_PAR_CODE, il est invalidé."""
    if vc is None:
        return
    echecs, _ = incrementer(f"code_courant:{vc.pk}", 15 * 60)
    if echecs >= MAX_ESSAIS_PAR_CODE:
        vc.delete()
        journaliser('code_bloque', utilisateur=vc.user_id, email=email)


class RegisterView(APIView):
    authentication_classes = []
    throttle_classes = [LimiteInscription]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        dto = RegisterDTO(
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            password_hash=make_password(data['password']),
            role=UserRole(data['role']),
            phone=data.get('phone'),
        )

        try:
            result = _service().register(dto, FallbackEventBus(), _new_code())
        except UserAlreadyExistsException:
            if UserModel.objects.filter(email__iexact=data['email']).exists():
                return Response({'email': ['Cette adresse email est déjà utilisée.']}, status=status.HTTP_409_CONFLICT)
            return Response({'phone': ['Ce numéro de téléphone est déjà utilisé.']}, status=status.HTTP_409_CONFLICT)
        except IntegrityError:
            return Response({'email': ['Ce compte existe déjà.']}, status=status.HTTP_409_CONFLICT)

        journaliser('inscription', request, utilisateur=result.id, email=str(result.email))
        return Response(_user_payload(result), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Compté avant la vérification : des essais simultanés ne peuvent pas dépasser la limite
        essais = Tentatives(f"connexion:{data['email']}", MAX_ESSAIS_CONNEXION, FENETRE_CONNEXION)
        if not essais.essayer():
            journaliser('connexion_bloquee', request, email=data['email'])
            return _trop_d_essais(essais.attente, code='too_many_attempts')

        try:
            user = _service().find_for_authentication(data['email'])
        except UserNotFoundException:
            check_password(data['password'], _EMPREINTE_FACTICE)
            journaliser('connexion_echec', request, email=data['email'])
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not check_password(data['password'], str(user.password_hash)):
            journaliser('connexion_echec', request, utilisateur=user.id, email=data['email'])
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'Compte désactivé.', 'code': 'inactive'}, status=status.HTTP_403_FORBIDDEN)

        if not user.is_verified:
            return Response(
                {'detail': "Compte non vérifié. Veuillez vérifier votre adresse email.", 'code': 'unverified_email'},
                status=status.HTTP_403_FORBIDDEN,
            )

        essais.reussite()
        journaliser('connexion', request, utilisateur=user.id, email=data['email'])
        return Response({**_tokens_for(user.id), 'user': _user_payload(user)}, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    authentication_classes = []
    throttle_classes = [LimiteGoogle]

    def post(self, request):
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'detail': 'id_token requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = _service().google_authenticate(GoogleAuthDTO(id_token=id_token), GoogleAPITokenVerifier())
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        if not result.is_active:
            return Response({'detail': 'Compte désactivé.', 'code': 'inactive'}, status=status.HTTP_403_FORBIDDEN)

        journaliser('connexion_google', request, utilisateur=result.id, email=str(result.email))
        return Response({**_tokens_for(result.id), 'user': _user_payload(result)}, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    authentication_classes = []
    throttle_classes = [LimiteCodes]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        code = str(request.data.get("code", "")).strip()

        if not email or not code:
            return Response({"detail": "Email et code requis."}, status=status.HTTP_400_BAD_REQUEST)

        essais = _essais_code(email)
        if not essais.essayer():
            return _trop_d_essais(essais.attente, code='too_many_attempts')

        vc = VerificationCode.objects.filter(
            user__email__iexact=email, expires_at__gt=timezone.now(),
        ).order_by('-expires_at').first()
        try:
            user_id = _service().verify_email(email, code, FallbackEventBus())
        except UserNotFoundException:
            # Même réponse qu'un mauvais code : on ne révèle pas quelles adresses ont un compte
            return Response({"detail": "Code invalide ou expiré.", "code": "invalid_code"}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            if 'déjà' in str(e):
                return Response({"detail": str(e), "code": "already_verified"}, status=status.HTTP_400_BAD_REQUEST)
            _echec_code(email, vc)
            return Response({"detail": str(e), "code": "invalid_code"}, status=status.HTTP_400_BAD_REQUEST)

        essais.reussite()
        journaliser('email_verifie', request, utilisateur=user_id, email=email)
        # Le code prouve la possession de l'email : on ouvre directement la session
        user = _service().get_by_id(user_id)
        return Response({
            "detail": "Compte vérifié avec succès.",
            **_tokens_for(user_id),
            "user": _user_payload(user),
        }, status=status.HTTP_200_OK)


class ResendCodeView(APIView):
    authentication_classes = []
    throttle_classes = [LimiteEnvoiCodes]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()

        if not email:
            return Response({'detail': 'Email requis.'}, status=status.HTTP_400_BAD_REQUEST)

        envoye = Response({'detail': 'Code renvoyé.'}, status=status.HTTP_200_OK)
        user_model = UserModel.objects.filter(email__iexact=email).first()
        if not user_model:
            # Même réponse qu'un envoi réussi : on ne révèle pas quelles adresses ont un compte
            return envoye

        if user_model.is_verified:
            return Response({'detail': 'Compte déjà vérifié.', 'code': 'already_verified'}, status=status.HTTP_400_BAD_REQUEST)

        last = VerificationCode.objects.filter(user=user_model).order_by('-expires_at').first()
        if last:
            sent_at = last.expires_at - timedelta(minutes=10)
            wait = (sent_at + RESEND_COOLDOWN - timezone.now()).total_seconds()
            if wait > 0:
                return Response(
                    {'detail': f'Veuillez patienter {int(wait) + 1} s avant de redemander un code.', 'retry_after': int(wait) + 1},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Le compteur d'essais n'est PAS remis à zéro : redemander un code ne donne pas de nouveaux essais
        code = _new_code()
        _service().store_verification_code(user_model.id, code)
        FallbackEventBus().publish(UserRegistered(
            event='users.email_verification_requested',
            user_id=str(user_model.id),
            email=user_model.email,
            first_name=user_model.first_name,
            code=code,
        ))

        return envoye


class PasswordResetRequestView(APIView):
    authentication_classes = []
    throttle_classes = [LimiteEnvoiCodes]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return Response({'email': ['Email requis.']}, status=status.HTTP_400_BAD_REQUEST)

        # Réponse identique que le compte existe ou non (pas d'énumération des emails)
        generic = Response(
            {'detail': 'Si un compte existe pour cette adresse, un code vient de vous être envoyé.'},
            status=status.HTTP_200_OK,
        )

        user_model = UserModel.objects.filter(email__iexact=email, is_active=True).first()
        if not user_model:
            return generic

        cooldown_key = f"reset_cooldown:{email}"
        if cache.get(cooldown_key):
            return generic
        cache.set(cooldown_key, True, timeout=int(RESEND_COOLDOWN.total_seconds()))

        code = _new_code()
        _service().store_verification_code(user_model.id, code)
        FallbackEventBus().publish(PasswordResetRequested(
            event='users.password_reset_requested',
            user_id=str(user_model.id),
            email=user_model.email,
            first_name=user_model.first_name,
            code=code,
        ))
        return generic


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    throttle_classes = [LimiteCodes]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        email = data['email']

        essais = _essais_code(email)
        if not essais.essayer():
            return _trop_d_essais(essais.attente)

        user_model = UserModel.objects.filter(email__iexact=email, is_active=True).first()
        vc = None
        if user_model:
            vc = VerificationCode.objects.filter(
                user=user_model, expires_at__gt=timezone.now(),
            ).order_by('-expires_at').first()
        if not vc or not vc.correspond(data['code']):
            _echec_code(email, vc)
            return Response({'code': ['Code invalide ou expiré.']}, status=status.HTTP_400_BAD_REQUEST)

        user_model.set_password(data['password'])
        user_model.is_verified = True  # le code prouve la possession de l'email
        user_model.save(update_fields=['password', 'is_verified'])
        VerificationCode.objects.filter(user=user_model).delete()
        # Toutes les sessions ouvertes (peut-être par la personne qui avait le mot de passe) sont fermées
        revoquer_jetons(user_model.id)
        essais.reussite()
        journaliser('mdp_reinitialise', request, utilisateur=user_model, email=email)
        return Response({'detail': 'Mot de passe modifié.'}, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    serializer_class = RefreshWithGracePeriodSerializer
