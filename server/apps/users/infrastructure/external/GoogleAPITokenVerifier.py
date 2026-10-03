import requests
from apps.users.application.ports.GoogleTokenVerifier import GoogleTokenVerifier, GoogleUserInfo


class GoogleAPITokenVerifier(GoogleTokenVerifier):

    _URL = "https://oauth2.googleapis.com/tokeninfo"

    def verify(self, id_token: str) -> GoogleUserInfo:
        response = requests.get(self._URL, params={"id_token": id_token})
        if response.status_code != 200:
            raise ValueError("Token Google invalide ou expiré.")

        data = response.json()
        return GoogleUserInfo(
            google_id=data['sub'],
            email=data['email'],
            first_name=data.get('given_name', ''),
            last_name=data.get('family_name', ''),
            avatar_url=data.get('picture'),
            email_verified=str(data.get('email_verified', 'false')).lower() == 'true',
        )
