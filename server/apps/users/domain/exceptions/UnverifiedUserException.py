class UnverifiedUserException(Exception):
    def __init__(self, email: str):
        super().__init__(f"Le compte '{email}' n'est pas encore vérifié.")