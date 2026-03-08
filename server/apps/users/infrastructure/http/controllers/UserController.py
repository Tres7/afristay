from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.users.application.dto.dto import UpdateProfileDTO
from apps.users.application.service.UserService import UserService
from apps.users.domain.exceptions import UserNotFoundException
from apps.users.domain.value_objects import PhoneNumber
from apps.users.infrastructure.persistence.DjangoUserRepository import DjangoUserRepository


def _service() -> UserService:
    return UserService(DjangoUserRepository())


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = _service().get_by_id(request.user.id)
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
            })
        except UserNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request):
        try:
            dto = UpdateProfileDTO(
                first_name=request.data.get('first_name'),
                last_name=request.data.get('last_name'),
                phone=PhoneNumber.of(request.data.get('phone')),
                avatar_url=request.data.get('avatar_url'),
            )
            result = _service().update_profile(request.user.id, dto)
            return Response({
                'id': str(result.id),
                'email': str(result.email),
                'first_name': result.first_name,
                'last_name': result.last_name,
                'role': result.role,
                'phone': str(result.phone) if result.phone else None,
                'avatar_url': result.avatar_url,
            })
        except UserNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        try:
            _service().deactivate(request.user.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
