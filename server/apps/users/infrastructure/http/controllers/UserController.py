from django.db import IntegrityError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.users.application.dto.dto import UpdateProfileDTO
from apps.users.application.service.UserService import UserService
from apps.users.domain.exceptions import UserNotFoundException
from apps.users.domain.value_objects import PhoneNumber
from apps.users.infrastructure.persistence.DjangoUserRepository import DjangoUserRepository
from apps.users.infrastructure.persistence.models import UserModel


def _service() -> UserService:
    return UserService(DjangoUserRepository())


def _payload(result) -> dict:
    return {
        'id': str(result.id),
        'email': str(result.email),
        'first_name': result.first_name,
        'last_name': result.last_name,
        'role': result.role,
        'phone': str(result.phone) if result.phone else None,
        'avatar_url': result.avatar_url,
        'is_verified': result.is_verified,
        'is_active': result.is_active,
        'date_joined': UserModel.objects.values_list('date_joined', flat=True).get(id=result.id),
    }


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response(_payload(_service().get_by_id(request.user.id)))
        except UserNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request):
        raw_phone = request.data.get('phone')
        if raw_phone:
            raw_phone = ''.join(ch for ch in str(raw_phone) if ch not in ' .-()')
            if UserModel.objects.filter(phone=raw_phone).exclude(id=request.user.id).exists():
                return Response({'phone': ['Ce numéro est déjà utilisé par un autre compte.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dto = UpdateProfileDTO(
                first_name=(request.data.get('first_name') or '').strip() or None,
                last_name=(request.data.get('last_name') or '').strip() or None,
                phone=PhoneNumber.of(raw_phone),
                avatar_url=request.data.get('avatar_url'),
            )
            if request.data.get('role') == 'hote':
                _service().become_host(request.user.id)
            result = _service().update_profile(request.user.id, dto)
            return Response(_payload(result))
        except UserNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'phone': ['Numéro invalide. Format attendu : +22890000000.']}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response({'phone': ['Ce numéro est déjà utilisé par un autre compte.']}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        try:
            _service().deactivate(request.user.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
