
from dataclasses import dataclass
from typing import Optional
from abc import ABC, abstractmethod


@dataclass
class GoogleUserInfo:
    google_id: str
    email: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    email_verified: bool = False


class GoogleTokenVerifier(ABC):
    @abstractmethod
    def verify(self, id_token: str) -> GoogleUserInfo:
        pass