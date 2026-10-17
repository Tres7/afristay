"""Limites de débit et compteurs de tentatives, atomiques (une seule requête PostgreSQL par incrément)."""
import ipaddress
import random
from datetime import datetime

from django.conf import settings
from django.db import connection
from django.utils import timezone
from rest_framework.throttling import BaseThrottle

from .models import CompteurModel

_INCREMENTER = """
    INSERT INTO securite_compteur (cle, valeur, expire_le)
    VALUES (%s, 1, now() + make_interval(secs => %s))
    ON CONFLICT (cle) DO UPDATE SET
        valeur = CASE WHEN securite_compteur.expire_le <= now() THEN 1 ELSE securite_compteur.valeur + 1 END,
        expire_le = CASE WHEN securite_compteur.expire_le <= now() THEN EXCLUDED.expire_le
                         ELSE securite_compteur.expire_le END
    RETURNING valeur, expire_le
"""


def incrementer(cle: str, fenetre_secondes: int) -> tuple[int, datetime]:
    """Ajoute 1 au compteur `cle` (fenêtre fixe) et renvoie (nouvelle valeur, fin de la fenêtre)."""
    with connection.cursor() as cursor:
        cursor.execute(_INCREMENTER, [cle[:200], fenetre_secondes])
        valeur, expire_le = cursor.fetchone()
    if random.random() < 0.01:
        # Ménage occasionnel : les compteurs échus ne servent plus
        CompteurModel.objects.filter(expire_le__lte=timezone.now()).delete()
    return valeur, expire_le


def reinitialiser(cle: str) -> None:
    CompteurModel.objects.filter(cle=cle[:200]).delete()


def secondes_restantes(expire_le: datetime) -> int:
    return max(1, int((expire_le - timezone.now()).total_seconds()) + 1)


def ip_client(request) -> str | None:
    """Adresse du client. Derrière N proxys de confiance (DJANGO_NUM_PROXIES), l'adresse ajoutée par le dernier
    proxy dans X-Forwarded-For ; sans proxy, REMOTE_ADDR (un X-Forwarded-For envoyé par le client est ignoré)."""
    adresse = request.META.get('REMOTE_ADDR')
    proxys = settings.NUM_PROXIES
    transmis = request.META.get('HTTP_X_FORWARDED_FOR')
    if proxys and transmis:
        adresses = [a.strip() for a in transmis.split(',') if a.strip()]
        if adresses:
            adresse = adresses[-min(proxys, len(adresses))]
    try:
        return str(ipaddress.ip_address(adresse)) if adresse else None
    except ValueError:
        return None


def limite_ip(nom: str, nombre: int, secondes: int):
    """Throttle DRF : au plus `nombre` requêtes par adresse IP et par fenêtre de `secondes`."""

    class LimiteIP(BaseThrottle):
        def allow_request(self, request, view):
            if not settings.LIMITES_ACTIVES:
                return True
            valeur, expire_le = incrementer(f"ip:{nom}:{ip_client(request) or 'inconnue'}", secondes)
            self._attente = secondes_restantes(expire_le)
            return valeur <= nombre

        def wait(self):
            return getattr(self, '_attente', secondes)

    LimiteIP.__name__ = f"LimiteIP_{nom}"
    return LimiteIP


class Tentatives:
    """Compteur de tentatives d'une ressource (email, code…) : chaque essai est compté AVANT d'être vérifié,
    ce qui rend la limite exacte même avec des requêtes simultanées. Un succès remet le compteur à zéro."""

    def __init__(self, cle: str, maximum: int, fenetre_secondes: int):
        self.cle, self.maximum, self.fenetre = cle, maximum, fenetre_secondes
        self.attente = 0

    def essayer(self) -> bool:
        """Compte une tentative. False si la limite est dépassée (self.attente : secondes avant de réessayer)."""
        if not settings.LIMITES_ACTIVES:
            return True
        valeur, expire_le = incrementer(self.cle, self.fenetre)
        self.attente = secondes_restantes(expire_le)
        return valeur <= self.maximum

    def reussite(self) -> None:
        reinitialiser(self.cle)
