"""Pre-launch mode (PRELANCEMENT=True in the API environment).

Hosts can already sign up and prepare their listings, and agents can verify them, but nothing is shown to the public,
booked or paid until the company is registered: listings are hidden (HebergementModel.objects.publiees()) and every
entry point that creates a booking or collects money refuses the request (verifier_ouverture). Switching back to
PRELANCEMENT=False only needs a restart of the API: the verified listings then become public as usual.
"""
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

CODE = 'prelancement'
MESSAGE = "Kwa-Ba ouvre bientôt : les réservations et les paiements ne sont pas encore ouverts."


def actif() -> bool:
    return settings.PRELANCEMENT


class OuvertureAVenir(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = MESSAGE
    default_code = CODE

    def __init__(self):
        # The code lets the site show its own translated message
        super().__init__({'detail': MESSAGE, 'code': CODE})


def verifier_ouverture() -> None:
    """To call first in any view that creates a booking, a transfer, a rental, a donation or a payment."""
    if actif():
        raise OuvertureAVenir()
