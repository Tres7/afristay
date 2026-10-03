# This class is the payload (body) of the event which will be sent
from dataclasses import dataclass

from apps.users.application.events.DomainEvent import DomainEvent


@dataclass
class UserRegistered(DomainEvent):
    event: str
    user_id: str
    email: str
    first_name: str
    code: str