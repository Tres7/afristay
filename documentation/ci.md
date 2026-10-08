# CI

La CI tourne sur les pull requests vers `main` (`.github/workflows/pr_main.yml`). Une branche sans PR n'a pas de CI : le hook pre-push donne le retour rapide en local.

## Ce qui tourne

| Job | Contenu | Quand |
| --- | --- | --- |
| Plan | Chemins modifiés → serveur, client, infra, broker, docs seules | Toujours |
| App / Serveur | `ruff check`, `makemigrations --check`, `check --deploy`, tests `unit` puis `integration` (PostgreSQL 16), couverture combinée dans le résumé du job | `server/**` ou `.github/**` modifié |
| App / Client | ESLint, `tsc` | `client/**` ou `.github/**` modifié |
| Docker | `docker compose config`, hadolint, build de l'image serveur, `next build` | Après App, hors brouillon |
| PR status | Échoue si un job a échoué ou été annulé ; un job ignoré est toléré | Toujours |

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

```bash
cd server
pip install -r requirements-dev.txt
pytest -m unit                      # sans base
docker compose up -d db             # PostgreSQL exposé sur le port 5433
POSTGRES_HOST=localhost POSTGRES_PORT=5433 pytest -m integration
```

## Hook pre-push

```bash
pip install pre-commit
pre-commit install
```

Avant chaque push : `ruff check` et tests unitaires si `server/` a changé, ESLint et `tsc` si `client/` a changé. Le venv du serveur doit être activé.

## Lint

- Serveur : `server/ruff.toml`. Seules les règles qui révèlent des bugs sont actives (`E4`, `E7`, `E9`, `F`). Le tri des imports et `ruff format` viendront dans une PR dédiée.
- Client : `client/eslint.config.mjs` (`next/core-web-vitals`, `next/typescript`), lancé par `npm run lint`.
