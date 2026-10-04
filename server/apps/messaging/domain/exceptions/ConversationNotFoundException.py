class ConversationNotFoundException(Exception):
    def __init__(self, conversation_id: str):
        super().__init__(f"Conversation introuvable : {conversation_id}")
