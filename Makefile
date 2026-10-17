.DEFAULT_GOAL := help
.PHONY: help install lint test test-unit

VENV := server/.venv
PY := $(VENV)/bin/python

help: ## Affiche les commandes disponibles
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

$(PY):
	python3 -m venv $(VENV)

install: $(PY) ## Prépare le poste : venv du serveur, dépendances, npm ci, hooks pre-push
	$(PY) -m pip install --quiet -r server/requirements-dev.txt
	npm --prefix client ci --no-audit --no-fund
	$(PY) -m pre_commit install
	$(PY) -m pre_commit install-hooks

lint: ## Lint du serveur et du client
	cd server && .venv/bin/ruff check .
	npm --prefix client run lint
	npm --prefix client run typecheck

test-unit: ## Tests unitaires du serveur (aucun conteneur)
	cd server && .venv/bin/python -m pytest -m unit

test: ## Tous les tests du serveur (démarre PostgreSQL de test si besoin)
	cd server && .venv/bin/python -m pytest
