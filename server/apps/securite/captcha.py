"""Captcha Cloudflare Turnstile : connexion et inscription.

Le navigateur obtient un jeton du widget (case à cocher, souvent validée sans clic) ; le serveur le fait
confirmer par Cloudflare. Sans TURNSTILE_SECRET_KEY (développement, tests), le captcha est désactivé.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger('apps.securite')

URL_VERIFICATION = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
MESSAGE = 'Confirmez que vous n\'êtes pas un robot (case à cocher), puis réessayez.'


def actif() -> bool:
    return bool(settings.TURNSTILE_SECRET_KEY and settings.TURNSTILE_SITE_KEY)


def valide(jeton) -> bool:
    """True si Cloudflare confirme le jeton (à usage unique). Captcha désactivé : toujours True.

    Cloudflare injoignable : on laisse passer (journalisé) plutôt que d'empêcher toute connexion ; les limites
    de tentatives et de débit restent appliquées.
    """
    if not actif():
        return True
    if not jeton or not isinstance(jeton, str) or len(jeton) > 2048:
        return False
    # Pas de remoteip : la connexion passe par le serveur Next.js, dont l'adresse n'est pas celle du visiteur
    donnees = {'secret': settings.TURNSTILE_SECRET_KEY, 'response': jeton}
    try:
        reponse = requests.post(URL_VERIFICATION, data=donnees, timeout=5)
        reponse.raise_for_status()
        return bool(reponse.json().get('success'))
    except (requests.RequestException, ValueError):
        logger.warning('Turnstile injoignable : captcha non vérifié', exc_info=True)
        return True
