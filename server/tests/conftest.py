from pathlib import Path

import pytest

from tests import services

_TESTS_DIR = Path(__file__).parent
_MARKERS = ('unit', 'integration', 'broker')


def pytest_collection_modifyitems(config, items):
    """Pose le marqueur unit / integration / broker d'après le dossier du test.

    Un test de tests/unit qui toucherait la base échoue de lui-même :
    pytest-django refuse l'accès sans le marqueur django_db.
    """
    for item in items:
        layer = Path(item.fspath).relative_to(_TESTS_DIR).parts[0]
        if layer not in _MARKERS:
            raise pytest.UsageError(f'{item.nodeid} : les tests vont dans tests/unit, tests/integration ou tests/broker')
        item.add_marker(getattr(pytest.mark, layer))


@pytest.fixture(scope='session')
def django_db_modify_db_settings(django_db_modify_db_settings_parallel_suffix):
    """Appelé par pytest-django juste avant de créer la base de test, donc seulement si un test touche la base.

    Démarre alors le conteneur PostgreSQL de test (voir tests/services.py) et y pointe Django.
    """
    if services.externally_provided():
        yield
        return

    from django.conf import settings

    started = services.start(services.POSTGRES['service'])
    # Modification en place : les connexions déjà créées partagent ce dictionnaire
    settings.DATABASES['default'].update(services.POSTGRES['settings'])
    yield
    if started:
        services.stop(services.POSTGRES['service'])


@pytest.fixture(autouse=True)
def _http_test_client(settings):
    # Le client de test parle en HTTP : sans ceci, la redirection HTTPS de production renverrait des 301
    settings.SECURE_SSL_REDIRECT = False
