import pytest

ME = '/api/v1/users/me/'
LOGIN = '/api/v1/auth/login/'
REFRESH = '/api/v1/auth/refresh/'


def _login(api_client, user, password):
    return api_client.post(LOGIN, {'email': user.email, 'password': password}, format='json').data


class TestMe:
    def test_requires_authentication(self, api_client):
        assert api_client.get(ME).status_code == 401

    def test_update_names_and_ignore_empty_fields(self, client_for, make_user):
        user = make_user(first_name='Ama', last_name='Kossi')
        response = client_for(user).patch(ME, {'first_name': 'Afi', 'last_name': '  '}, format='json')
        assert response.status_code == 200
        assert (response.data['first_name'], response.data['last_name']) == ('Afi', 'Kossi')

    def test_invalid_phone(self, client_for, make_user):
        assert client_for(make_user()).patch(ME, {'phone': '1234'}, format='json').status_code == 400

    def test_phone_of_another_account(self, client_for, make_user):
        make_user(phone='+22890000000')
        assert client_for(make_user()).patch(ME, {'phone': '+228 90 00 00 00'}, format='json').status_code == 400

    def test_become_host_but_never_admin(self, client_for, make_user):
        user = make_user()
        client = client_for(user)
        assert client.patch(ME, {'role': 'admin'}, format='json').data['role'] == 'voyageur'
        assert client.patch(ME, {'role': 'hote'}, format='json').data['role'] == 'hote'

    def test_delete_deactivates_account(self, api_client, make_user, password):
        user = make_user()
        access = _login(api_client, user, password)['access']
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        assert api_client.delete(ME).status_code == 204
        assert api_client.get(ME).status_code == 401
        api_client.credentials()
        response = api_client.post(LOGIN, {'email': user.email, 'password': password}, format='json')
        assert response.data['code'] == 'inactive'


class TestRefresh:
    def test_refresh_returns_new_tokens(self, api_client, make_user, password):
        tokens = _login(api_client, make_user(), password)
        response = api_client.post(REFRESH, {'refresh': tokens['refresh']}, format='json')
        assert response.status_code == 200
        assert {'access', 'refresh'} <= response.data.keys()

    def test_invalid_refresh(self, api_client):
        assert api_client.post(REFRESH, {'refresh': 'pas-un-jeton'}, format='json').status_code == 401

    @pytest.mark.xfail(strict=True, raises=AssertionError, reason=(
        "Anomalie : ROTATE_REFRESH_TOKENS sans l'application token_blacklist, l'ancien refresh reste valable 7 jours."
    ))
    def test_rotated_refresh_token_cannot_be_reused(self, api_client, make_user, password):
        refresh = _login(api_client, make_user(), password)['refresh']
        assert api_client.post(REFRESH, {'refresh': refresh}, format='json').status_code == 200
        assert api_client.post(REFRESH, {'refresh': refresh}, format='json').status_code == 401
