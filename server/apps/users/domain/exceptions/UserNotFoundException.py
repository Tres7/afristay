class UserNotFoundException(Exception):
    def __init__(self, identifier: str):
        super().__init__(f"Utilisateur introuvable : {identifier}")