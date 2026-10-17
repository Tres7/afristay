"""Stockage des fichiers envoyés (photos, avatars) sur Cloudflare R2, via son API compatible S3."""
from collections.abc import Mapping


def r2_storage(env: Mapping[str, str]) -> dict | None:
    """Backend de stockage R2 si R2_BUCKET est défini, sinon None (disque local)."""
    if not env.get('R2_BUCKET'):
        return None
    return {
        'BACKEND': 'storages.backends.s3.S3Storage',
        'OPTIONS': {
            'bucket_name': env['R2_BUCKET'],
            'endpoint_url': env['R2_ENDPOINT_URL'],          # https://<compte>.r2.cloudflarestorage.com
            'access_key': env['R2_ACCESS_KEY_ID'],
            'secret_key': env['R2_SECRET_ACCESS_KEY'],
            # Domaine public du bucket (sans https://) : les URL des photos sont enregistrées dans les annonces,
            # elles doivent rester valables (pas d'URL signée qui expire)
            'custom_domain': env['R2_PUBLIC_DOMAIN'],
            'querystring_auth': False,
            'region_name': 'auto',
            'signature_version': 's3v4',
            'default_acl': None,      # R2 ne gère pas les ACL
            'file_overwrite': False,
        },
    }


def r2_storage_prive(env: Mapping[str, str]) -> dict | None:
    """Documents privés (pièces d'identité des hôtes, photos des visites) dans un bucket R2 sans domaine public.

    Jamais d'URL publique : les fichiers ne sont lus que par l'API, après contrôle du rôle (apps.verifications).
    None si R2_PRIVE_BUCKET n'est pas défini (disque local, dossier non servi par le serveur web).
    """
    if not env.get('R2_PRIVE_BUCKET'):
        return None
    return {
        'BACKEND': 'storages.backends.s3.S3Storage',
        'OPTIONS': {
            'bucket_name': env['R2_PRIVE_BUCKET'],
            'endpoint_url': env['R2_ENDPOINT_URL'],
            'access_key': env['R2_ACCESS_KEY_ID'],
            'secret_key': env['R2_SECRET_ACCESS_KEY'],
            'querystring_auth': True,     # aucune URL publique
            'region_name': 'auto',
            'signature_version': 's3v4',
            'default_acl': None,
            'file_overwrite': False,
        },
    }
