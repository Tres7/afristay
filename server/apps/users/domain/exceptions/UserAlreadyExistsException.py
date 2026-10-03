class UserAlreadyExistsException(Exception):
    def __init__(self, identifier: str):
        super().__init__(f"Un utilisateur avec '{identifier}' existe déjà.")