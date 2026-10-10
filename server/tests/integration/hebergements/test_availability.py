from datetime import timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone

from apps.hebergements.models import BlocageModel

HEBERGEMENTS = '/api/v1/hebergements/'


def _day(offset):
    return timezone.localdate() + timedelta(days=offset)


@pytest.fixture
def listing(make_hebergement):
    return make_hebergement()


class TestAvailability:
    def url(self, listing):
        return f'{HEBERGEMENTS}{listing.id}/disponibilites/'

    def test_public_view_merges_touching_periods_without_details(self, api_client, listing, make_reservation):
        make_reservation(listing, starts_in=10, nights=3)
        BlocageModel.objects.create(hebergement=listing, debut=_day(13), fin=_day(15), motif='Travaux')
        make_reservation(listing, starts_in=20, nights=2, status='cancelled')

        periods = api_client.get(self.url(listing)).data['periodes']
        assert periods == [{'debut': _day(10), 'fin': _day(15)}]

    def test_host_view_has_details(self, client_for, listing, make_reservation):
        reservation = make_reservation(listing, starts_in=10, nights=3)
        BlocageModel.objects.create(hebergement=listing, debut=_day(13), fin=_day(15), motif='Travaux')

        periods = client_for(listing.host).get(self.url(listing)).data['periodes']
        assert [(p['type'], p.get('reference'), p.get('motif')) for p in periods] == [
            ('reservation', reservation.reference, None),
            ('blocage', None, 'Travaux'),
        ]

    @pytest.mark.parametrize('params', [
        {'debut': 'abc'},
        {'debut': '2026-10-10', 'fin': '2026-10-10'},
        {'debut': '2026-01-01', 'fin': '2027-07-04'},
    ])
    def test_invalid_period(self, api_client, listing, params):
        assert api_client.get(self.url(listing), params).status_code == 400

    def test_default_window_is_one_year(self, api_client, listing):
        data = api_client.get(self.url(listing)).data
        assert (data['fin'] - data['debut']).days == 365

    def test_unknown_listing(self, api_client):
        assert api_client.get(f'{HEBERGEMENTS}00000000-0000-0000-0000-000000000000/disponibilites/').status_code == 404


class TestBlocages:
    def url(self, listing):
        return f'{HEBERGEMENTS}{listing.id}/blocages/'

    def test_host_closes_dates(self, client_for, listing):
        response = client_for(listing.host).post(self.url(listing), {'debut': _day(5), 'fin': _day(8)}, format='json')
        assert response.status_code == 201
        assert BlocageModel.objects.filter(hebergement=listing).count() == 1

    def test_other_user_forbidden(self, client_for, make_user, listing):
        response = client_for(make_user(role='hote')).post(self.url(listing), {'debut': _day(5), 'fin': _day(8)},
                                                           format='json')
        assert response.status_code == 403

    def test_period_with_reservation_conflicts(self, client_for, listing, make_reservation):
        make_reservation(listing, starts_in=6, nights=1)
        response = client_for(listing.host).post(self.url(listing), {'debut': _day(5), 'fin': _day(8)}, format='json')
        assert response.status_code == 409

    def test_overlapping_blocage_conflicts(self, client_for, listing):
        BlocageModel.objects.create(hebergement=listing, debut=_day(7), fin=_day(9))
        response = client_for(listing.host).post(self.url(listing), {'debut': _day(5), 'fin': _day(8)}, format='json')
        assert response.status_code == 409

    @pytest.mark.parametrize('debut, fin', [(8, 8), (8, 5), (-2, 3), (5, 800)])
    def test_invalid_dates(self, client_for, listing, debut, fin):
        response = client_for(listing.host).post(self.url(listing), {'debut': _day(debut), 'fin': _day(fin)},
                                                 format='json')
        assert response.status_code == 400

    def test_delete_by_host_only(self, client_for, make_user, listing):
        blocage = BlocageModel.objects.create(hebergement=listing, debut=_day(5), fin=_day(8))
        url = f'{HEBERGEMENTS}blocages/{blocage.id}/'
        assert client_for(make_user(role='hote')).delete(url).status_code == 404
        assert client_for(listing.host).delete(url).status_code == 204

    def test_database_rejects_end_before_start(self, listing):
        with pytest.raises(IntegrityError):
            BlocageModel.objects.create(hebergement=listing, debut=_day(8), fin=_day(5))

    def test_closed_dates_cannot_be_booked(self, client_for, make_user, listing):
        BlocageModel.objects.create(hebergement=listing, debut=_day(5), fin=_day(8))
        response = client_for(make_user()).post('/api/v1/reservations/', {
            'hebergement': str(listing.id), 'check_in': _day(6), 'check_out': _day(9),
        }, format='json')
        assert response.status_code == 400
