from dataclasses import dataclass
from typing import Optional
import uuid
from apps.users.domain.entities.User import User, UserRole
from apps.users.domain.value_objects import Email, PasswordHash, PhoneNumber


@dataclass
class RegisterDTO:
    email: Email
    first_name: str
    last_name: str
    password_hash: PasswordHash
    role: UserRole
    phone: Optional[PhoneNumber]


@dataclass
class UpdateProfileDTO:
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[PhoneNumber] = None
    avatar_url: Optional[str] = None


@dataclass
class UserResponseDTO:
    id: uuid.UUID
    email: Email
    first_name: str
    last_name: str
    role: str
    phone: Optional[PhoneNumber]
    avatar_url: Optional[str]
    is_verified: bool
    is_active: bool

    @staticmethod
    def from_entity(user: User) -> 'UserResponseDTO':
        return UserResponseDTO(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role.value,
            phone=user.phone,
            avatar_url=user.avatar_url,
            is_verified=user.is_verified,
            is_active=user.is_active,
        )


@dataclass
class GoogleAuthDTO:
    id_token: str
