class NotParticipantException(Exception):
    def __init__(self, conversation_id: str):
        super().__init__(f"Vous ne participez pas à la conversation {conversation_id}.")
