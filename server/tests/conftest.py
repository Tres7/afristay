from pathlib import Path

import pytest

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
