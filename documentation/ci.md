# CI

La CI tourne sur les pull requests vers `main` (`.github/workflows/pr_main.yml`). Une branche sans PR n'a pas de CI : le hook pre-push donne le retour rapide en local.

## Ce qui tourne

| Job | Contenu | Quand |
| --- | --- | --- |
| Plan | Chemins modifiés → serveur, client, infra, broker, docs seules | Toujours |
| App / Serveur | `ruff check`, `makemigrations --check`, `check --deploy`, tests `unit` puis `integration` (PostgreSQL 16), couverture combinée et ses deux seuils (voir plus bas) | `server/**` ou `.github/**` modifié |
| App / Client | ESLint, `tsc` | `client/**` ou `.github/**` modifié |
| Docker | `docker compose config`, hadolint, build de l'image serveur puis scan Trivy, `next build` | Après App, hors brouillon |
| Security | `npm audit --omit=dev --audit-level=high` (client), `pip-audit` (serveur) | En parallèle, selon la partie modifiée |
| PR status | Échoue si un job a échoué ou été annulé ; un job ignoré est toléré | Toujours |

Trivy échoue sur toute vulnérabilité HIGH ou CRITICAL **qui a un correctif disponible** ; le rapport complet est dans le résumé du job.

## Après la fusion et la nuit

| Workflow | Déclencheur | Contenu |
| --- | --- | --- |
| `pre_push_main.yml` | Push sur `main` (sauf documentation seule) | Build de l'image serveur, scan Trivy, puis push sur `ghcr.io/tres7/afristay-server` (tags `sha-<commit>` et `main`) seulement si le scan passe |
| `nightly.yml` | Chaque nuit à 1 h UTC, ou à la main | Scan Trivy de l'image `main` publiée : détecte les CVE apparues depuis le dernier push |
| Dependabot | Chaque jour à 3 h (Paris), sur `main` uniquement | PR de mise à jour : actions, pip, npm, images Docker de base |

Une PR en brouillon ne lance que le lint et les tests unitaires. La passer en « prête » relance tout.

**Protection de `main`** : exiger uniquement le contrôle `PR status`.

## Tests du serveur

Les tests vivent dans `server/tests/`, et leur dossier fixe le marqueur :

| Dossier | Marqueur | Dépendances |
| --- | --- | --- |
| `tests/unit/` | `unit` | Aucune. pytest-django refuse l'accès à la base dans ces tests |
| `tests/integration/` | `integration` | PostgreSQL. RabbitMQ est simulé « en panne » : les emails passent par le repli (`mail.outbox`) |
| `tests/broker/` | `broker` | PostgreSQL et RabbitMQ réels (à venir) |

SQLite n'est pas utilisable (`SKIP LOCKED`, `DatabaseCache`, contraintes).

### Lancer les tests en local

```bash
cd server
source .venv/bin/activate
pip install -r requirements-dev.txt   # une fois

pytest -m unit                        # sans base, aucun conteneur
pytest                                # tout : démarre PostgreSQL de test si besoin
pytest -m integration                 # intégration seule
pytest tests/integration/avis         # un dossier, un fichier ou un test (::nom_du_test)
pytest -rxX                           # affiche aussi la liste des anomalies connues (xfail)
```

Les conteneurs sont démarrés **uniquement si un test en a besoin**. Le premier test qui touche la base lance `postgres-test` (`compose.test.yaml`, projet `afristay-test`, port 55432, données en mémoire), puis l'arrête en fin de session. `pytest -m unit` ne démarre rien. La stack de développement (`compose.yaml`) n'est jamais touchée.

| Variable | Effet |
| --- | --- |
| `TEST_KEEP_SERVICES=1` | Laisse `postgres-test` démarré : les exécutions suivantes gagnent quelques secondes. Arrêt : `docker compose -f compose.test.yaml down` |
| `TEST_SERVICES=external` | Aucun conteneur : PostgreSQL est fourni par ailleurs via `POSTGRES_HOST`, `POSTGRES_PORT`, etc. (c'est le cas en CI) |

Un conteneur `postgres-test` déjà démarré est réutilisé et laissé en place. Sans Docker (sous WSL, activer l'intégration WSL de Docker Desktop), les tests d'intégration s'arrêtent avec un message explicite ; les tests unitaires tournent normalement.

Couverture comme en CI :

```bash
pytest -m unit --cov --cov-report= && pytest -m integration --cov --cov-append --cov-report=
coverage report        # échoue sous le cliquet de .coveragerc
coverage html          # rapport dans htmlcov/
```

Les services hexagonaux (`messaging`, `UserService`) se testent sans base, avec les fakes en mémoire de `tests/unit/messaging/fakes.py`. Les tests de concurrence (`@pytest.mark.django_db(transaction=True)`) lancent de vrais threads sur PostgreSQL.

## Couverture

Mesurée sur `server/apps` (unit + integration combinés, branches comprises). Rapport dans le résumé du job, HTML en artefact `coverage-server`.

| Seuil | Règle | Où |
| --- | --- | --- |
| Cliquet global | La couverture totale ne descend jamais sous `fail_under` | `server/.coveragerc` (88 % à la mise en place) |
| Code modifié | 80 % minimum des lignes modifiées par la PR | `diff-cover` contre la branche cible |

Quand la couverture progresse, remonter `fail_under` dans la même PR. Les seuils ne s'appliquent pas aux PR en brouillon (tests unitaires seuls).

## Anomalies connues (`xfail`)

Chaque anomalie repérée a un test qui décrit le comportement attendu, marqué `@pytest.mark.xfail(strict=True, raises=AssertionError)`. Tant que le bug existe, le test est « xfail » et la CI reste verte. Le jour où le correctif arrive, le test passe, `strict=True` fait échouer la CI : retirer alors le marqueur `xfail` dans la PR du correctif.

| Anomalie | Test |
| --- | --- |
| Deux réservations simultanées des mêmes dates sont toutes deux acceptées | `integration/reservations/test_concurrency.py` |
| Recherche : `check_in`, `check_out`, `price_min`, `price_max` invalides → 500 | `integration/hebergements/test_search.py` |
| `max_guests=0` accepté à la création d'un logement | `integration/hebergements/test_listings.py` |
| Avis : `?hebergement=abc` → 500 | `integration/avis/test_avis_api.py` |
| Avis : `?limit=-5` → 500 | `integration/avis/test_avis_api.py` |
| Un refresh token déjà utilisé reste valable (pas de `token_blacklist`) | `integration/users/test_profile_and_tokens.py` |
| Emails texte : « N'Guessan » devient « N&#x27;Guessan » (échappement HTML) | `unit/notifications/test_email_sender.py` |

`pytest -rxX` affiche la liste en fin d'exécution.

## Hook pre-push

```bash
pip install pre-commit
pre-commit install
```

Avant chaque push : `ruff check` et tests unitaires si `server/` a changé, ESLint et `tsc` si `client/` a changé. Le venv du serveur doit être activé.

## Lint

- Serveur : `server/ruff.toml`. Seules les règles qui révèlent des bugs sont actives (`E4`, `E7`, `E9`, `F`). Le tri des imports et `ruff format` viendront dans une PR dédiée.
- Client : `client/eslint.config.mjs` (`next/core-web-vitals`, `next/typescript`), lancé par `npm run lint`.
