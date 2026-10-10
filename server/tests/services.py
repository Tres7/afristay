"""Conteneurs nécessaires aux tests, démarrés uniquement quand un test en a besoin.

- Un test sans base (tests/unit) ne démarre rien.
- Le premier test qui touche la base démarre `postgres-test` (compose.test.yaml), puis l'arrête en fin de session
  s'il ne tournait pas déjà.
- TEST_SERVICES=external : les services sont fournis par ailleurs (CI, PostgreSQL local) via POSTGRES_HOST, etc.
- TEST_KEEP_SERVICES=1 : laisse les conteneurs démarrés pour enchaîner les exécutions plus vite.
"""
import os
import shutil
import subprocess
from pathlib import Path

import pytest

COMPOSE_FILE = Path(__file__).resolve().parents[2] / 'compose.test.yaml'

POSTGRES = {
    'service': 'postgres-test',
    'settings': {'HOST': '127.0.0.1', 'PORT': '55432', 'NAME': 'afristay', 'USER': 'afristay',
                 'PASSWORD': 'afristay-test'},
}


def externally_provided() -> bool:
    return os.getenv('TEST_SERVICES') == 'external'


def _compose(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(['docker', 'compose', '-f', str(COMPOSE_FILE), *args],
                          capture_output=True, text=True, check=check)


def _is_running(service: str) -> bool:
    return bool(_compose('ps', '--status', 'running', '--quiet', service, check=False).stdout.strip())


def start(service: str) -> bool:
    """Démarre le service et attend son healthcheck. Renvoie True si c'est nous qui l'avons démarré."""
    if shutil.which('docker') is None:
        pytest.exit(
            "Docker est introuvable : impossible de démarrer les services de test. "
            "Installez Docker (ou activez l'intégration WSL de Docker Desktop), ou fournissez PostgreSQL "
            "vous-même avec TEST_SERVICES=external et POSTGRES_HOST / POSTGRES_PORT.",
            returncode=pytest.ExitCode.USAGE_ERROR,
        )
    if _is_running(service):
        return False
    result = _compose('up', '--detach', '--wait', service, check=False)
    if result.returncode != 0:
        pytest.exit(f'Démarrage de {service} impossible :\n{result.stderr}', returncode=pytest.ExitCode.USAGE_ERROR)
    return True


def stop(service: str) -> None:
    if os.getenv('TEST_KEEP_SERVICES') != '1':
        _compose('rm', '--stop', '--force', service, check=False)
