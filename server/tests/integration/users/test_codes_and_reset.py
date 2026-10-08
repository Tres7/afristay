from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from apps.users.infrastructure.persistence.models import VerificationCode

VERIFY = '/api/v1/auth/verify/'
RESEND = '/api/v1/auth/resend-code/'
RESET = '/api/v1/auth/password-reset/'
RESET_CONFIRM = '/api/v1/auth/password-reset/confirm/'
LOGIN = '/api/v1/auth/login/'
NEW_PASSWORD = 'Nouveau-Mot-De-Passe-2026!'


# Le générateur produit 100000 à 999999 : un nouveau code ne peut jamais être égal à celui-ci
INITIAL_CODE = '012345'


@pytest.fixture
def unverified(make_user):
    user = make_user(is_verified=False)
    VerificationCode.objects.create(user=user, code=INITIAL_CODE, expires_at=timezone.now() + timedelta(minutes=10))
    return user


def _age_codes(user, seconds):
    """Fait comme si le dernier code avait été envoyé il y a `seconds` secondes."""
    VerificationCode.objects.filter(user=user).update(
        expires_at=timezone.now() + timedelta(minutes=10) - timedelta(seconds=seconds),
    )


class TestVerify:
    def test_wrong_code(self, api_client, unverified):
        response = api_client.post(VERIFY, {'email': unverified.email, 'code': '000000'}, format='json')
        assert response.status_code == 400
        assert response.data['code'] == 'invalid_code'

    def test_five_failures_lock_even_the_right_code(self, api_client, unverified):
        for _ in range(5):
            api_client.post(VERIFY, {'email': unverified.email, 'code': '000000'}, format='json')
        response = api_client.post(VERIFY, {'email': unverified.email, 'code': INITIAL_CODE}, format='json')
        assert response.status_code == 429
        assert response.data['code'] == 'too_many_attempts'

    def test_expired_code(self, api_client, unverified):
        _age_codes(unverified, seconds=11 * 60)
        assert api_client.post(VERIFY, {'email': unverified.email, 'code': INITIAL_CODE}, format='json').status_code == 400

    def test_already_verified(self, api_client, make_user):
        user = make_user()
        response = api_client.post(VERIFY, {'email': user.email, 'code': INITIAL_CODE}, format='json')
        assert response.data['code'] == 'already_verified'

    def test_success_sends_welcome_email(self, api_client, unverified):
        response = api_client.post(VERIFY, {'email': unverified.email, 'code': INITIAL_CODE}, format='json')
        assert response.status_code == 200
        assert [m.to for m in mail.outbox] == [[unverified.email]]

    def test_missing_fields(self, api_client):
        assert api_client.post(VERIFY, {}, format='json').status_code == 400


class TestResendCode:
    def test_cooldown_before_60_seconds(self, api_client, unverified):
        _age_codes(unverified, seconds=30)
        response = api_client.post(RESEND, {'email': unverified.email}, format='json')
        assert response.status_code == 429
        assert 0 < response.data['retry_after'] <= 31

    def test_new_code_after_60_seconds_invalidates_old_one(self, api_client, unverified):
        _age_codes(unverified, seconds=61)
        assert api_client.post(RESEND, {'email': unverified.email}, format='json').status_code == 200

        [code] = VerificationCode.objects.filter(user=unverified).values_list('code', flat=True)
        old = api_client.post(VERIFY, {'email': unverified.email, 'code': INITIAL_CODE}, format='json')
        assert old.status_code == 400
        assert api_client.post(VERIFY, {'email': unverified.email, 'code': code}, format='json').status_code == 200

    def test_resend_resets_attempt_counter(self, api_client, unverified):
        for _ in range(5):
            api_client.post(VERIFY, {'email': unverified.email, 'code': '000000'}, format='json')
        _age_codes(unverified, seconds=61)
        api_client.post(RESEND, {'email': unverified.email}, format='json')

        code = VerificationCode.objects.get(user=unverified).code
        assert api_client.post(VERIFY, {'email': unverified.email, 'code': code}, format='json').status_code == 200

    def test_already_verified(self, api_client, make_user):
        assert api_client.post(RESEND, {'email': make_user().email}, format='json').status_code == 400


class TestPasswordReset:
    def test_same_response_for_existing_unknown_and_inactive_accounts(self, api_client, make_user):
        responses = [
            api_client.post(RESET, {'email': email}, format='json')
            for email in (make_user().email, 'personne@example.tg', make_user(is_active=False).email)
        ]
        assert {r.status_code for r in responses} == {200}
        assert responses[0].data == responses[1].data == responses[2].data
        assert len(mail.outbox) == 1

    def test_second_request_within_cooldown_sends_no_email(self, api_client, make_user):
        user = make_user()
        first = api_client.post(RESET, {'email': user.email}, format='json')
        second = api_client.post(RESET, {'email': user.email}, format='json')
        assert first.data == second.data
        assert len(mail.outbox) == 1

    def test_full_reset_flow(self, api_client, make_user, password):
        user = make_user(is_verified=False)
        api_client.post(RESET, {'email': user.email}, format='json')
        code = VerificationCode.objects.get(user=user).code

        response = api_client.post(RESET_CONFIRM, {
            'email': user.email, 'code': code, 'password': NEW_PASSWORD, 'password_confirm': NEW_PASSWORD,
        }, format='json')

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.is_verified is True
        assert not VerificationCode.objects.filter(user=user).exists()
        assert api_client.post(LOGIN, {'email': user.email, 'password': NEW_PASSWORD}, format='json').status_code == 200
        assert api_client.post(LOGIN, {'email': user.email, 'password': password}, format='json').status_code == 401

    @pytest.mark.parametrize('code', ['abcdef', '000000'])
    def test_wrong_code(self, api_client, make_user, code):
        user = make_user()
        api_client.post(RESET, {'email': user.email}, format='json')
        response = api_client.post(RESET_CONFIRM, {
            'email': user.email, 'code': code, 'password': NEW_PASSWORD, 'password_confirm': NEW_PASSWORD,
        }, format='json')
        assert response.status_code == 400

    def test_five_failures_lock(self, api_client, make_user):
        user = make_user()
        payload = {'email': user.email, 'code': '000000', 'password': NEW_PASSWORD, 'password_confirm': NEW_PASSWORD}
        for _ in range(5):
            api_client.post(RESET_CONFIRM, payload, format='json')
        assert api_client.post(RESET_CONFIRM, payload, format='json').status_code == 429

    def test_weak_password_rejected(self, api_client, make_user):
        user = make_user()
        api_client.post(RESET, {'email': user.email}, format='json')
        code = VerificationCode.objects.get(user=user).code
        response = api_client.post(RESET_CONFIRM, {
            'email': user.email, 'code': code, 'password': '12345678', 'password_confirm': '12345678',
        }, format='json')
        assert response.status_code == 400
