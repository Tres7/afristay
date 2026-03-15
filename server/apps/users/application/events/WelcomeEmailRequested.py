from dataclasses import dataclass
from apps.users.application.events.DomainEvent import DomainEvent

@dataclass
class WelcomeEmailRequested(DomainEvent):
    event: str
    user_id: str
    email: str
    first_name: str
