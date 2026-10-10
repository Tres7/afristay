import secrets
from datetime import timedelta
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

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
MAX_VERIFY_ATTEMPTS = 5


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


class RegisterView(APIView):
    authentication_classes = []

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

        return Response(_user_payload(result), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            user = _service().find_for_authentication(data['email'])
        except UserNotFoundException:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not check_password(data['password'], str(user.password_hash)):
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'Compte désactivé.', 'code': 'inactive'}, status=status.HTTP_403_FORBIDDEN)

        if not user.is_verified:
            return Response(
                {'detail': "Compte non vérifié. Veuillez vérifier votre adresse email.", 'code': 'unverified_email'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response({**_tokens_for(user.id), 'user': _user_payload(user)}, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    authentication_classes = []

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

        return Response({**_tokens_for(result.id), 'user': _user_payload(result)}, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        code = str(request.data.get("code", "")).strip()

        if not email or not code:
            return Response({"detail": "Email et code requis."}, status=status.HTTP_400_BAD_REQUEST)

        attempts_key = f"verify_attempts:{email}"
        if cache.get(attempts_key, 0) >= MAX_VERIFY_ATTEMPTS:
            return Response(
                {"detail": "Trop de tentatives. Demandez un nouveau code.", "code": "too_many_attempts"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            user_id = _service().verify_email(email, code, FallbackEventBus())
        except UserNotFoundException:
            return Response({"detail": "Aucun compte associé à cette adresse."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            if 'déjà' in str(e):
                return Response({"detail": str(e), "code": "already_verified"}, status=status.HTTP_400_BAD_REQUEST)
            cache.set(attempts_key, cache.get(attempts_key, 0) + 1, timeout=600)
            return Response({"detail": str(e), "code": "invalid_code"}, status=status.HTTP_400_BAD_REQUEST)

        cache.delete(attempts_key)
        # Le code prouve la possession de l'email : on ouvre directement la session
        user = _service().get_by_id(user_id)
        return Response({
            "detail": "Compte vérifié avec succès.",
            **_tokens_for(user_id),
            "user": _user_payload(user),
        }, status=status.HTTP_200_OK)


class ResendCodeView(APIView):
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()

        if not email:
            return Response({'detail': 'Email requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_model = UserModel.objects.get(email__iexact=email)
        except UserModel.DoesNotExist:
            return Response({'detail': 'Aucun compte associé à cette adresse.'}, status=status.HTTP_404_NOT_FOUND)

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

        code = _new_code()
        _service().store_verification_code(user_model.id, code)
        cache.delete(f"verify_attempts:{email}")
        FallbackEventBus().publish(UserRegistered(
            event='users.email_verification_requested',
            user_id=str(user_model.id),
            email=user_model.email,
            first_name=user_model.first_name,
            code=code,
        ))

        return Response({'detail': 'Code renvoyé.'}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    authentication_classes = []

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
        cache.delete(f"reset_attempts:{email}")
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

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        email = data['email']

        attempts_key = f"reset_attempts:{email}"
        if cache.get(attempts_key, 0) >= MAX_VERIFY_ATTEMPTS:
            return Response(
                {'detail': 'Trop de tentatives. Demandez un nouveau code.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user_model = UserModel.objects.filter(email__iexact=email, is_active=True).first()
        vc = None
        if user_model:
            vc = VerificationCode.objects.filter(
                user=user_model, code=data['code'], expires_at__gt=timezone.now(),
            ).first()
        if not vc:
            cache.set(attempts_key, cache.get(attempts_key, 0) + 1, timeout=600)
            return Response({'code': ['Code invalide ou expiré.']}, status=status.HTTP_400_BAD_REQUEST)

        user_model.set_password(data['password'])
        user_model.is_verified = True  # le code prouve la possession de l'email
        user_model.save(update_fields=['password', 'is_verified'])
        VerificationCode.objects.filter(user=user_model).delete()
        cache.delete(attempts_key)
        return Response({'detail': 'Mot de passe modifié.'}, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    serializer_class = RefreshWithGracePeriodSerializer

