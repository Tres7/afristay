import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    value: str
    def __post_init__(self):
        normalized = self.value.strip().lower()
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', normalized):
            raise ValueError(f"Email invalide : {self.value}")
        object.__setattr__(self, 'value', normalized)

    def __str__(self) -> str:
        return self.value