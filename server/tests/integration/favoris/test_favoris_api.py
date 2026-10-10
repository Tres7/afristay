from apps.favoris.models import FavoriModel

FAVORIS = '/api/v1/favoris/'


def test_add_is_idempotent(client_for, make_user, make_hebergement):
    user, listing = make_user(), make_hebergement()
    client = client_for(user)

    assert client.post(FAVORIS, {'hebergement': str(listing.id)}, format='json').status_code == 201
    assert client.post(FAVORIS, {'hebergement': str(listing.id)}, format='json').status_code == 200
    assert FavoriModel.objects.filter(user=user, hebergement=listing).count() == 1


def test_unknown_listing(client_for, make_user):
    response = client_for(make_user()).post(FAVORIS, {'hebergement': '00000000-0000-0000-0000-000000000000'},
                                            format='json')
    assert response.status_code == 400


def test_remove(client_for, make_user, make_hebergement):
    user, listing = make_user(), make_hebergement()
    FavoriModel.objects.create(user=user, hebergement=listing)
    client = client_for(user)

    assert client.delete(f'{FAVORIS}{listing.id}/').status_code == 204
    assert client.delete(f'{FAVORIS}{listing.id}/').status_code == 404


def test_list_only_own_favorites(client_for, make_user, make_hebergement):
    user = make_user()
    mine = make_hebergement(name='Le mien')
    FavoriModel.objects.create(user=user, hebergement=mine)
    FavoriModel.objects.create(user=make_user(), hebergement=make_hebergement(name='Pas le mien'))

    results = client_for(user).get(FAVORIS).data['results']
    assert [f['hebergement'] for f in results] == [mine.id]


def test_anonymous_unauthorized(api_client):
    assert api_client.get(FAVORIS).status_code == 401
