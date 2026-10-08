import pytest
from rest_framework.test import APIClient

from apps.hebergements.models import HebergementModel
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
def client_for(api_client):
    def _login_as(user):
        api_client.force_authenticate(user=user)
        return api_client

    return _login_as
