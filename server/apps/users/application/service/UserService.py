import uuid

from django.contrib.auth.hashers import make_password

from apps.users.domain.entities.User import User, UserRole
from apps.users.domain.repositories.UserRepository import UserRepository
from apps.users.domain.exceptions import (
    UserAlreadyExistsException,
    UserNotFoundException
)
from apps.users.application.dto.dto import (
    GoogleAuthDTO,
    RegisterDTO,
    UpdateProfileDTO,
    UserResponseDTO
)
from apps.users.application.events.UserRegistered import UserRegistered
from apps.users.application.ports import EventPublisher
from apps.users.domain.value_objects import Email, PasswordHash, PhoneNumber


class UserService:

    def __init__(self, user_repository: UserRepository):
        self._repository = user_repository

    def register(self, dto: RegisterDTO, event_bus: EventPublisher, code: str) -> UserResponseDTO:
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
            phone=PhoneNumber.of(dto.phone) if isinstance(dto.phone, str) else dto.phone,
        )

        saved_user = self._repository.save(user)

        try:
            event_bus.publish(UserRegistered(
                event='users.email_verification_requested',
                user_id=str(saved_user.id),
                email=str(saved_user.email),
                first_name=saved_user.first_name,
                code=code,
            ))
        except Exception:
            pass  # RabbitMQ indisponible : l'inscription reste valide

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

    def google_authenticate(self, dto: GoogleAuthDTO, verifier) -> UserResponseDTO:
        info = verifier.verify(dto.id_token)

        user = self._repository.find_by_email(info.email)
        if not user:
            user = User(
                email=Email(info.email),
                first_name=info.first_name,
                last_name=info.last_name,
                password_hash=PasswordHash(make_password(None)),  # compte sans mot de passe
                role=UserRole.VOYAGEUR,
                is_verified=True,
                avatar_url=info.avatar_url,
            )
            user = self._repository.save(user)

        return UserResponseDTO.from_entity(user)
