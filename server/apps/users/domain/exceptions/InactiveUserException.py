class InactiveUserException(Exception):
    def __init__(self, email: str):
        super().__init__(f"Le compte '{email}' est désactivé.")