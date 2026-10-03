import re
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class PhoneNumber:
    value: str

    def __post_init__(self):
        cleaned = re.sub(r'\s+', '', self.value)
        if not re.match(r'^\+\d{8,15}$', cleaned):
            raise ValueError(f"Numéro invalide : {self.value}. Format attendu : +22890000000")
        object.__setattr__(self, 'value', cleaned)

    def __str__(self) -> str:
        return self.value
    
    # If phone number is not provided, give none
    @classmethod
    def of(cls, value: Optional[str]) -> Optional['PhoneNumber']:
        if not value:
            return None
        return cls(value)

    @staticmethod
    def to_str(phone: Optional['PhoneNumber']) -> Optional[str]:
        return phone.value if phone else None
