import pytest
import requests

from apps.users.infrastructure.persistence.models import UserModel

GOOGLE = '/api/v1/auth/google/'
KWABA_CLIENT_ID = 'kwaba-web.apps.googleusercontent.com'


@pytest.fixture(autouse=True)
def kwaba_client_id(settings):
    settings.GOOGLE_CLIENT_IDS = [KWABA_CLIENT_ID]


def _google_answers(monkeypatch, aud):
    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {'aud': aud, 'iss': 'accounts.google.com', 'sub': 'google-123', 'email': 'ama@example.tg',
                    'email_verified': 'true', 'given_name': 'Ama', 'family_name': 'Kossi'}

    monkeypatch.setattr(requests, 'get', lambda *args, **kwargs: Response())


def test_login_with_token_issued_for_kwaba(api_client, monkeypatch):
    _google_answers(monkeypatch, aud=KWABA_CLIENT_ID)
    response = api_client.post(GOOGLE, {'id_token': 'jeton'}, format='json')
    assert response.status_code == 200
    assert {'access', 'refresh'} <= response.data.keys()
    assert UserModel.objects.filter(email='ama@example.tg', google_id='google-123').exists()


def test_token_replayed_from_another_site_opens_nothing(api_client, monkeypatch, make_user):
    victim = make_user(email='ama@example.tg')
    _google_answers(monkeypatch, aud='site-tiers.apps.googleusercontent.com')

    response = api_client.post(GOOGLE, {'id_token': 'jeton-du-site-tiers'}, format='json')

    assert response.status_code == 401
    assert 'access' not in response.data
    victim.refresh_from_db()
    assert victim.google_id is None


def test_google_login_disabled_without_client_id(api_client, settings, monkeypatch):
    settings.GOOGLE_CLIENT_IDS = []
    _google_answers(monkeypatch, aud=KWABA_CLIENT_ID)
    assert api_client.post(GOOGLE, {'id_token': 'jeton'}, format='json').status_code == 401
