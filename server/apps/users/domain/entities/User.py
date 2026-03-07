from dataclasses import dataclass, field
import datetime
from enum import Enum
from typing import Optional
import uuid


class UserRole(Enum):
    VOYAGEUR = 'voyageur'
    HOTE = 'hote'
    ADMIN = 'admin'

@dataclass
class User:
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    email: str
    first_name: str
    last_name: str
    password_hash: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: UserRole
    is_verified: bool
    is_active: bool
    created_at: datetime = field(default_factory=datetime.datetime.now(datetime.timezone.utc))
    updated_at: datetime = field(default_factory=datetime.datetime.now(datetime.timezone.utc))
    

    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def is_host(self) -> bool:
        return self.role == UserRole.HOTE

    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def verify(self) -> None:
        """Valider le compte après confirmation email"""
        self.is_verified = True
        self.updated_at = datetime.utcnow()

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = datetime.datetime.now(datetime.timezone.utc)

    def change_role(self, new_role: UserRole) -> None:
        self.role = new_role
        self.updated_at = datetime.utcnow()
