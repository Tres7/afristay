"""URL d'images fournies par les utilisateurs (avatar, photos d'annonce).

Une image affichée à d'autres utilisateurs ne doit venir que d'un hôte connu : sinon son auteur peut y mettre
l'adresse de son propre serveur et recueillir l'adresse IP de chaque visiteur (pixel de suivi).
"""
from urllib.parse import urlsplit

from django.conf import settings

MESSAGE = "Image non autorisée : utilisez une photo envoyée sur Kwa-Ba."


def hote_autorise(hote: str) -> bool:
    hote = (hote or '').lower()
    for autorise in settings.IMAGES_HOTES_AUTORISES:
        if autorise.startswith('.'):
            if hote.endswith(autorise):
                return True
        elif hote == autorise:
            return True
    return False


def url_image_autorisee(url) -> bool:
    if not isinstance(url, str) or len(url) > 1000:
        return False
    try:
        morceaux = urlsplit(url.strip())
    except ValueError:
        return False
    schemas = ('https', 'http') if settings.DEBUG else ('https',)
    return morceaux.scheme in schemas and not morceaux.username and hote_autorise(morceaux.hostname)
