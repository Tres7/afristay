from django.contrib.auth.hashers import make_password, check_password
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.application.dto.dto import GoogleAuthDTO
from apps.users.infrastructure.external.GoogleAPITokenVerifier import GoogleAPITokenVerifier

from apps.users.application.dto.dto import RegisterDTO
from apps.users.application.service.UserService import UserService
from apps.users.domain.entities.User import UserRole
from apps.users.domain.exceptions import (
    UserAlreadyExistsException, UserNotFoundException,
    InactiveUserException, UnverifiedUserException,
)
from apps.users.domain.value_objects import Email, PasswordHash, PhoneNumber
from apps.users.infrastructure.persistence.DjangoUserRepository import DjangoUserRepository
from apps.users.infrastructure.persistence.models import UserModel


def _service() -> UserService:
    return UserService(DjangoUserRepository())


class RegisterView(APIView):

    def post(self, request):
        data = request.data
        required = ['email', 'first_name', 'last_name', 'password']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response(
                {'error': f'Champs manquants : {missing}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            dto = RegisterDTO(
                email=Email(data['email']),
                first_name=data['first_name'],
                last_name=data['last_name'],
                password_hash=PasswordHash(make_password(data['password'])),
                role=UserRole(data.get('role', 'voyageur')),
                phone=PhoneNumber.of(data.get('phone')),
            )
            result = _service().register(dto)
            return Response({
                'id': str(result.id),
                'email': str(result.email),
                'first_name': result.first_name,
                'last_name': result.last_name,
                'role': result.role,
                'is_verified': result.is_verified,
                'is_active': result.is_active,
            }, status=status.HTTP_201_CREATED)
        except UserAlreadyExistsException as e:
            return Response({'error': str(e)}, status=status.HTTP_409_CONFLICT)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response(
                {'error': 'Email et mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = _service().find_for_authentication(email)

            if not check_password(password, str(user.password_hash)):
                return Response(
                    {'error': 'Identifiants incorrects.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            if not user.is_active:
                raise InactiveUserException(email)
            if not user.is_verified:
                raise UnverifiedUserException(email)

            user_model = UserModel.objects.get(id=user.id)
            refresh = RefreshToken.for_user(user_model)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': str(user.id),
                    'email': str(user.email),
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role.value,
                }
            })
        except UserNotFoundException:
            return Response(
                {'error': 'Identifiants incorrects.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except InactiveUserException as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except UnverifiedUserException as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        

class GoogleAuthView(APIView):

    def post(self, request):
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'error': 'id_token requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dto = GoogleAuthDTO(id_token=id_token)
            result = _service().google_authenticate(dto, GoogleAPITokenVerifier())

            user_model = UserModel.objects.get(id=result.id)
            refresh = RefreshToken.for_user(user_model)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': str(result.id),
                    'email': str(result.email),
                    'first_name': result.first_name,
                    'last_name': result.last_name,
                    'role': result.role,
                }
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

