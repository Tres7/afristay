# infrastructure/persistence/user_repository.py
import uuid
from typing import Optional

from apps.users.domain.entities.User import User, UserRole
from apps.users.domain.repositories.UserRepository import UserRepository
from apps.users.domain.exceptions import UserNotFoundException
from apps.users.infrastructure.persistence.models import UserModel


class DjangoUserRepository(UserRepository):

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            first_name=model.first_name,
            last_name=model.last_name,
            password_hash=model.password,
            phone=model.phone,
            avatar_url=model.avatar.url if model.avatar else None,
            role=UserRole(model.role),
            is_verified=model.is_verified,
            is_active=model.is_active,
            created_at=model.date_joined,
            updated_at=model.last_login,
        )

    def find_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        try:
            model = UserModel.objects.get(id=user_id)
            return self._to_entity(model)
        except UserModel.DoesNotExist:
            return None

    def find_by_email(self, email: str) -> Optional[User]:
        try:
            model = UserModel.objects.get(email=email)
            return self._to_entity(model)
        except UserModel.DoesNotExist:
            return None

    def find_by_phone(self, phone: str) -> Optional[User]:
        try:
            model = UserModel.objects.get(phone=phone)
            return self._to_entity(model)
        except UserModel.DoesNotExist:
            return None

    def save(self, user: User) -> User:
        model = UserModel(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            role=user.role.value,
            is_verified=user.is_verified,
            is_active=user.is_active,
        )
        model.password = user.password_hash
        model.save()
        return self._to_entity(model)

    def update(self, user: User) -> User:
        try:
            model = UserModel.objects.get(id=user.id)
        except UserModel.DoesNotExist:
            raise UserNotFoundException(f"Utilisateur {user.id} introuvable.")

        model.email = user.email
        model.first_name = user.first_name
        model.last_name = user.last_name
        model.phone = user.phone
        model.role = user.role.value
        model.is_verified = user.is_verified
        model.is_active = user.is_active
        model.save()
        return self._to_entity(model)

    def delete(self, user_id: uuid.UUID) -> None:
        try:
            model = UserModel.objects.get(id=user_id)
            model.delete()
        except UserModel.DoesNotExist:
            raise UserNotFoundException(f"Utilisateur {user_id} introuvable.")

    def exists_by_email(self, email: str) -> bool:
        return UserModel.objects.filter(email=email).exists()

    def exists_by_phone(self, phone: str) -> bool:
        return UserModel.objects.filter(phone=phone).exists()
