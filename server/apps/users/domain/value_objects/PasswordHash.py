from dataclasses import dataclass


@dataclass(frozen=True)
class PasswordHash:
    value: str

    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("Le hash du mot de passe ne peut pas être vide.")

    def __str__(self) -> str:
        return self.value
