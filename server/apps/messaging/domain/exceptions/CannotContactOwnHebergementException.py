class CannotContactOwnHebergementException(Exception):
    def __init__(self, hebergement_id: str):
        super().__init__(f"Vous êtes l'hôte de l'hébergement {hebergement_id} : impossible de vous contacter vous-même.")
