import uuid

from apps.users.domain.entities.User import User, UserRole
from apps.users.domain.repositories.UserRepository import UserRepository
from apps.users.domain.exceptions import (
    UserAlreadyExistsException,
    UserNotFoundException
)
from apps.users.application.dto.dto import (
    RegisterDTO,
    UpdateProfileDTO,
    UserResponseDTO
)


class UserService:

    def __init__(self, user_repository: UserRepository):
        self._repository = user_repository

    def register(self, dto: RegisterDTO) -> UserResponseDTO:
        if self._repository.exists_by_email(dto.email):
            raise UserAlreadyExistsException(dto.email)

        if dto.phone and self._repository.exists_by_phone(dto.phone):
            raise UserAlreadyExistsException(dto.phone)

        user = User(
            email=dto.email,
            first_name=dto.first_name,
            last_name=dto.last_name,
            password_hash=dto.password_hash,
            role=dto.role,
            phone=dto.phone,
        )

        saved_user = self._repository.save(user)
        return UserResponseDTO.from_entity(saved_user)

    def get_by_id(self, user_id: uuid.UUID) -> UserResponseDTO:
        user = self._repository.find_by_id(user_id)
        if not user:
            raise UserNotFoundException(str(user_id))
        return UserResponseDTO.from_entity(user)

    def update_profile(self, user_id: uuid.UUID, dto: UpdateProfileDTO) -> UserResponseDTO:
        user = self._repository.find_by_id(user_id)
        if not user:
            raise UserNotFoundException(str(user_id))

        if dto.first_name:
            user.first_name = dto.first_name
        if dto.last_name:
            user.last_name = dto.last_name
        if dto.phone:
            user.phone = dto.phone
        if dto.avatar_url:
            user.avatar_url = dto.avatar_url

        updated_user = self._repository.update(user)
        return UserResponseDTO.from_entity(updated_user)

    def verify_account(self, user_id: uuid.UUID) -> None:
        user = self._repository.find_by_id(user_id)
        if not user:
            raise UserNotFoundException(str(user_id))
        user.verify()
        self._repository.update(user)

    def deactivate(self, user_id: uuid.UUID) -> None:
        user = self._repository.find_by_id(user_id)
        if not user:
            raise UserNotFoundException(str(user_id))
        user.deactivate()
        self._repository.update(user)

    def find_for_authentication(self, email: str) -> User:
        """Retourne l'entité complète avec password_hash pour l'authentification."""
        user = self._repository.find_by_email(email)
        if not user:
            raise UserNotFoundException(email)
        return user
