import logging

from .limites import ip_client
from .models import JournalAuditModel

logger = logging.getLogger('apps.securite')


def journaliser(action: str, request=None, utilisateur=None, email: str = '', **details) -> None:
    """Ajoute une entrée au journal d'audit. Ne doit jamais faire échouer la requête qui l'appelle.

    `utilisateur` : instance ou identifiant. Ne jamais passer de mot de passe, de code ni de jeton.
    """
    try:
        utilisateur_id = getattr(utilisateur, 'pk', utilisateur)
        JournalAuditModel.objects.create(
            action=action,
            utilisateur_id=utilisateur_id,
            email=(email or getattr(utilisateur, 'email', '') or '')[:254],
            ip=ip_client(request) if request is not None else None,
            details=details,
        )
    except Exception:
        logger.exception("Journal d'audit : écriture impossible (%s)", action)
