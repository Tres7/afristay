from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.hebergements.models import HebergementModel
from apps.reservations.models import ReservationModel
from apps.users.infrastructure.messaging.RabbitMQEventBus import RabbitMQEventBus
from apps.users.infrastructure.persistence.models import UserModel

PASSWORD = 'Afristay-Test-2026!'


@pytest.fixture(autouse=True)
def _db_and_fast_hasher(db, settings):
    # Tous les tests d'intégration ont accès à la base ; un hachage rapide évite ~0,3 s par mot de passe
    settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']


@pytest.fixture(autouse=True)
def _broker_down(monkeypatch):
    """Sans RabbitMQ, FallbackEventBus envoie l'email directement (mail.outbox).

    Les vrais échanges avec le broker sont testés dans tests/broker.
    """
    def refuse_connection(self, event):
        raise ConnectionError('RabbitMQ indisponible (tests d\'intégration)')

    monkeypatch.setattr(RabbitMQEventBus, 'publish', refuse_connection)


@pytest.fixture
def password():
    return PASSWORD


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_user():
    counter = iter(range(1, 10_000))

    def _make(role='voyageur', is_verified=True, **fields):
        n = next(counter)
        fields.setdefault('email', f'{role}{n}@test.afristay')
        fields.setdefault('first_name', 'Test')
        fields.setdefault('last_name', f'{role.capitalize()} {n}')
        return UserModel.objects.create_user(password=PASSWORD, role=role, is_verified=is_verified, **fields)

    return _make


@pytest.fixture
def make_hebergement(make_user):
    def _make(host=None, **fields):
        fields.setdefault('name', 'Villa test')
        fields.setdefault('city', 'Lomé')
        fields.setdefault('price_per_night', 25000)
        return HebergementModel.objects.create(host=host or make_user(role='hote'), **fields)

    return _make


@pytest.fixture
def raw_client():
    """Client qui renvoie la réponse 500 au lieu de lever l'exception de la vue (tests « jamais 500 »)."""
    client = APIClient()
    client.raise_request_exception = False
    return client


@pytest.fixture
def client_for():
    """Un client authentifié distinct par utilisateur."""
    def _login_as(user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    return _login_as


@pytest.fixture
def make_reservation(make_user):
    """Réservation écrite directement en base (y compris dans le passé, impossible via l'API)."""
    def _make(hebergement, guest=None, starts_in=10, nights=3, status='confirmed'):
        check_in = timezone.localdate() + timedelta(days=starts_in)
        return ReservationModel.objects.create(
            hebergement=hebergement, guest=guest or make_user(), check_in=check_in,
            check_out=check_in + timedelta(days=nights), total_price=0, status=status,
        )

    return _make
