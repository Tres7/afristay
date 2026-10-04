class ConversationAlreadyExistsException(Exception):
    """Levée par la persistance quand un fil (hébergement, voyageur) existe déjà (création concurrente)."""
    pass
