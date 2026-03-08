import random
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.application.dto.dto import GoogleAuthDTO, RegisterDTO, UserRole
from apps.users.application.service.UserService import UserService
from apps.users.application.events.UserRegistered import UserRegistered
from apps.users.application.ports.EventBus import EventBus
from apps.users.infrastructure.persistence.DjangoUserRepository import DjangoUserRepository
from apps.users.infrastructure.messaging.RabbitMQEventBus import RabbitMQEventBus
from apps.users.infrastructure.http.serializers.auth_serializers import RegisterSerializer, LoginSerializer
from apps.users.domain.exceptions import UserAlreadyExistsException, UserNotFoundException
from apps.users.infrastructure.persistence.models import UserModel
from apps.users.infrastructure.external import GoogleAPITokenVerifier



def _service() -> UserService:
    return UserService(DjangoUserRepository())


class RegisterView(APIView):

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
            code = str(random.randint(100000, 999999))
            result = _service().register(dto, RabbitMQEventBus(), code)
        except UserAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        return Response({
            'id': str(result.id),
            'email': str(result.email),
            'first_name': result.first_name,
            'last_name': result.last_name,
            'role': result.role,
            'phone': str(result.phone) if result.phone else None,
            'avatar_url': result.avatar_url,
            'is_verified': result.is_verified,
            'is_active': result.is_active,
        }, status=status.HTTP_201_CREATED)



class LoginView(APIView):

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            user = _service().find_for_authentication(data['email'])
        except UserNotFoundException:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not check_password(data['password'], user.password_hash):
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'Compte désactivé.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.users.infrastructure.persistence.models import UserModel
        model = UserModel.objects.get(id=user.id)
        refresh = RefreshToken.for_user(model)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': str(user.email),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role.value,
                'phone': str(user.phone) if user.phone else None,
                'avatar_url': user.avatar_url,
                'is_verified': user.is_verified,
                'is_active': user.is_active,
            },
        }, status=status.HTTP_200_OK)


    
class GoogleAuthView(APIView):

    def post(self, request):
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'detail': 'id_token requis.'}, status=status.HTTP_400_BAD_REQUEST)

        dto = GoogleAuthDTO(id_token=id_token)

        try:
            result = _service().google_authenticate(dto, GoogleAPITokenVerifier())
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        model = UserModel.objects.get(id=result.id)
        refresh = RefreshToken.for_user(model)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': result.__dict__,
        }, status=status.HTTP_200_OK)
