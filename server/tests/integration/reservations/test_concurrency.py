import threading
from datetime import timedelta

import pytest
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from apps.reservations import serializers as reservation_serializers
from apps.reservations.models import ReservationModel


@pytest.mark.django_db(transaction=True)
@pytest.mark.xfail(strict=True, raises=AssertionError, reason=(
    "Anomalie : validate() vérifie la disponibilité puis create() écrit, sans verrou ni contrainte "
    "d'exclusion. Correctif : select_for_update sur le logement ou EXCLUDE USING gist sur daterange."
))
def test_two_simultaneous_bookings_of_same_dates_only_one_succeeds(make_user, make_hebergement, monkeypatch):
    hebergement = make_hebergement()
    check_in = timezone.localdate() + timedelta(days=10)
    payload = {
        'hebergement': str(hebergement.id),
        'check_in': check_in.isoformat(),
        'check_out': (check_in + timedelta(days=3)).isoformat(),
    }

    # Force l'entrelacement : chaque requête attend que l'autre ait aussi vérifié la disponibilité.
    # Avec un verrou, la seconde reste bloquée : l'attente expire et la première continue seule.
    barrier = threading.Barrier(2, timeout=3)
    original_conflit = reservation_serializers.conflit

    def conflit_then_wait(*args):
        result = original_conflit(*args)
        try:
            barrier.wait()
        except threading.BrokenBarrierError:
            pass
        return result

    monkeypatch.setattr(reservation_serializers, 'conflit', conflit_then_wait)

    statuses = []

    def book(user):
        client = APIClient()
        client.raise_request_exception = False
        client.force_authenticate(user=user)
        try:
            statuses.append(client.post('/api/v1/reservations/', payload, format='json').status_code)
        finally:
            connection.close()

    threads = [threading.Thread(target=book, args=(make_user(),)) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=15)

    assert sorted(statuses)[0] == 201
    assert statuses.count(201) == 1
    assert ReservationModel.objects.filter(hebergement=hebergement).count() == 1
