class HebergementNotFoundException(Exception):
    def __init__(self, hebergement_id: str):
        super().__init__(f"Hébergement introuvable : {hebergement_id}")
