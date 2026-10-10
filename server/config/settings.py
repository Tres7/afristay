"""
Django settings for Kwa-Ba project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured

from config.storage import r2_storage

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

def _env_bool(name: str, default: str) -> bool:
    return os.getenv(name, default).lower() in ('true', '1', 'yes')


def _env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(',') if item.strip()]


# Production par défaut : le développement active DEBUG explicitement (server/.env)
DEBUG = _env_bool('DJANGO_DEBUG', 'False')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('DJANGO_SECRET_KEY est obligatoire hors développement (DJANGO_DEBUG=False).')
    SECRET_KEY = 'django-insecure-dev-only'

ALLOWED_HOSTS = _env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0,backend')
# Render fournit le nom d'hôte public du service
if os.getenv('RENDER_EXTERNAL_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ['RENDER_EXTERNAL_HOSTNAME'])


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    # Local
    'apps.users',
    'apps.notifications.apps.NotificationsConfig',
    'apps.hebergements.apps.HebergementsConfig',
    'apps.reservations.apps.ReservationsConfig',
    'apps.favoris.apps.FavorisConfig',
    'apps.avis.apps.AvisConfig',
    'apps.messaging.apps.MessagingConfig',
    'apps.paiements.apps.PaiementsConfig',
    'apps.transferts.apps.TransfertsConfig',
    'apps.voyages.apps.VoyagesConfig',
    'apps.concierge.apps.ConciergeConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Fichiers statiques (admin) servis par l'application, sans serveur web devant Gunicorn
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database - PostgreSQL via Docker

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'afristayDB'),
        'USER': os.getenv('POSTGRES_USER', 'afristay'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'afristay'),
        'HOST': os.getenv('POSTGRES_HOST', 'db'),
        'PORT': os.getenv('POSTGRES_PORT', '5432'),
    }
}


# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'mediafiles'

# Photos et avatars : disque local en développement, stockage objet Cloudflare R2 (API S3) dès que R2_BUCKET
# est défini. Le disque des conteneurs Render est éphémère : sans R2, les photos disparaissent au redéploiement.
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}
if (_r2 := r2_storage(os.environ)) is not None:
    STORAGES['default'] = _r2


# Default primary key field type

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'users.UserModel'


# Django REST Framework

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'COERCE_DECIMAL_TO_STRING': False,
    # Throttles par scope (appliqués uniquement aux vues qui les déclarent)
    'DEFAULT_THROTTLE_RATES': {
        'messaging_conversation_create': '10/hour',
        'messaging_message_send': '30/min',
        'hebergement_photo_upload': '120/hour',
    },
}


# Cache partagé entre processus (compteurs des throttles), stocké dans PostgreSQL.
# La table est créée par la migration messaging 0002 (createcachetable).

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'django_cache',
    }
}


# Messagerie (voir documentation/modules/messaging.md)

MESSAGING = {
    'EMAIL_DELAY_SECONDS': int(os.getenv('MESSAGING_EMAIL_DELAY_SECONDS', '60')),
    'EMAIL_HOURLY_CAP': int(os.getenv('MESSAGING_EMAIL_HOURLY_CAP', '5')),
    'OUTBOX_RETENTION_DAYS': int(os.getenv('MESSAGING_OUTBOX_RETENTION_DAYS', '7')),
    'RELAY_INTERVAL_SECONDS': int(os.getenv('MESSAGING_RELAY_INTERVAL_SECONDS', '10')),
}

# Paiement en ligne (FedaPay). Sans clé FedaPay ni PayPal, le paiement en ligne est désactivé :
# les réservations sont alors confirmées immédiatement, sans encaissement.
FEDAPAY = {
    'SECRET_KEY': os.getenv('FEDAPAY_SECRET_KEY', ''),
    'ENV': os.getenv('FEDAPAY_ENV', 'sandbox'),  # sandbox | live
    'WEBHOOK_SECRET': os.getenv('FEDAPAY_WEBHOOK_SECRET', ''),
    # Durée pendant laquelle les dates restent bloquées en attendant le paiement
    'EXPIRATION_MINUTES': int(os.getenv('PAIEMENT_EXPIRATION_MINUTES', '30')),
}

# PayPal (paiement en euros). Sans identifiants, PayPal n'est pas proposé.
# Les versements aux hôtes passent toujours par FedaPay.
PAYPAL = {
    'CLIENT_ID': os.getenv('PAYPAL_CLIENT_ID', ''),
    'CLIENT_SECRET': os.getenv('PAYPAL_CLIENT_SECRET', ''),
    'ENV': os.getenv('PAYPAL_ENV', 'sandbox'),  # sandbox | live
}

# URL du frontend, utilisée dans les liens des emails
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
# Pause entre deux emails envoyés par le worker des paiements (limite des SMTP de test comme Mailtrap)
PAIEMENTS_PAUSE_EMAIL = float(os.getenv('PAIEMENTS_PAUSE_EMAIL', '1'))

# AI Concierge (Gemini, API Interactions de Google). Sans clé, le Concierge est désactivé.
CONCIERGE = {
    'API_KEY': os.getenv('GEMINI_API_KEY', ''),
    'MODELE': os.getenv('CONCIERGE_MODELE', 'gemini-3.8-flash'),
    # Profondeur de réflexion du modèle : minimal | low | medium | high (low = réponses rapides)
    'REFLEXION': os.getenv('CONCIERGE_REFLEXION', 'low'),
    'RECHERCHE_WEB': os.getenv('CONCIERGE_RECHERCHE_WEB', 'True').lower() in ('true', '1', 'yes'),
    # Limites par utilisateur (coût de l'API)
    'MAX_PAR_HEURE': int(os.getenv('CONCIERGE_MAX_PAR_HEURE', '20')),
    'MAX_PAR_JOUR': int(os.getenv('CONCIERGE_MAX_PAR_JOUR', '60')),
}

# Contact d'assistance donné aux voyageurs (transferts aéroport…)
ASSISTANCE_CONTACT = os.getenv('ASSISTANCE_CONTACT', 'info@kwa-ba.com')

# Adresse de réponse des emails envoyés (les réponses des utilisateurs arrivent dans cette boîte)
EMAIL_REPLY_TO = os.getenv('EMAIL_REPLY_TO', '')

# URL publique de l'API (liens vers l'administration dans les alertes)
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')


# HTTPS en production : Render termine TLS et transmet X-Forwarded-Proto
SECURE_REDIRECT_EXEMPT = [r'^api/health/$']   # sonde de santé interne, en HTTP
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = _env_bool('DJANGO_SECURE_SSL_REDIRECT', 'True')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv('DJANGO_SECURE_HSTS_SECONDS', str(60 * 60 * 24 * 365)))

# L'API est servie sur un sous-domaine (onrender.com, puis un domaine de l'équipe) : HSTS ne doit ni couvrir
# les autres sous-domaines ni être préchargé dans les navigateurs, décisions à prendre au niveau du domaine.
SILENCED_SYSTEM_CHECKS = ['security.W005', 'security.W021']


# CORS

CORS_ALLOWED_ORIGINS = _env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')


SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    # L'ancien refresh token est mis sur liste noire à chaque rotation (purge : manage.py flushexpiredtokens)
    'BLACKLIST_AFTER_ROTATION': True,
}

# Délai pendant lequel un refresh token qui vient d'être renouvelé renvoie encore la même nouvelle paire.
# NextAuth renouvelle le même jeton en parallèle au chargement d'une page : sans ce délai, seul le premier
# appel réussirait et les autres déconnecteraient l'utilisateur.
JWT_REFRESH_GRACE_SECONDS = int(os.getenv('JWT_REFRESH_GRACE_SECONDS', '60'))

# Email (permet donc de changer de provider quand on veut)
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").lower() in ("true", "1", "yes")

DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "20"))


# Logging : affiche les logs INFO des modules métier (apps.*) dans la sortie des conteneurs
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {'format': '[{levelname}] {name}: {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'simple'},
    },
    'loggers': {
        'apps': {'handlers': ['console'], 'level': 'INFO'},
    },
}

