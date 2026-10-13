import logging


class SansSondeDeSante(logging.Filter):
    """Pas d'email d'alerte pour la sonde de santé : interrogée toutes les quelques secondes, elle enverrait un
    email par appel pendant une panne de la base (déjà signalée par la plateforme d'hébergement)."""

    def filter(self, record):
        requete = getattr(record, 'request', None)
        return getattr(requete, 'path', '') != '/api/health/'
