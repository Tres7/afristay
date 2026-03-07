# this repository defines how user can be saved
# it defines methods without body. Infrastructure will make the body
from abc import ABC, abstractmethod
from typing import Optional
import uuid

from apps.users.domain.entities.User import User


class UserRepository(ABC):

    @abstractmethod
    def find_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        pass

    @abstractmethod
    def find_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    def find_by_phone(self, phone: str) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> User:
        pass

    @abstractmethod
    def update(self, user: User) -> User:
        pass

    @abstractmethod
    def delete(self, user_id: uuid.UUID) -> None:
        pass

    @abstractmethod
    def exists_by_email(self, email: str) -> bool:
        pass

    @abstractmethod
    def exists_by_phone(self, phone: str) -> bool:
        pass
