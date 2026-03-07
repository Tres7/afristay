class InvalidRoleException(Exception):
    def __init__(self, role: str):
        super().__init__(f"Rôle invalide : {role}")