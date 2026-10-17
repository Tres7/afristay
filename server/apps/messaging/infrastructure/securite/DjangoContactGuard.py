import uuid

from apps.messaging.application.ports.ContactGuard import ContactGuard, Screening
from apps.securite import coordonnees, fraude


class DjangoContactGuard(ContactGuard):
    """Filtrage commun aux messages et aux annonces (apps.securite.coordonnees), alertes pour le back-office."""

    def screen(self, text: str) -> Screening:
        content, findings = coordonnees.analyser(text)
        return Screening(content=content, masked=coordonnees.masquees(findings), findings=findings)

    def report(self, sender_id: uuid.UUID, conversation_id: uuid.UUID, screening: Screening) -> None:
        fraude.signaler(sender_id, 'message', conversation_id, screening.findings)
