#!/usr/bin/env bash
# Vérifie qu'une sauvegarde se restaure vraiment : restauration dans un PostgreSQL jetable (Docker), puis contrôles.
#
# Usage : SAUVEGARDE_PHRASE=... deploy/scripts/test-restauration.sh sauvegardes/kwaba-<date>.dump.gpg
# PG_VERSION : version majeure de PostgreSQL du conteneur de restauration (16 par défaut, celle de la production).
# Elle doit être au moins égale à celle du pg_dump qui a produit la sauvegarde.
# À lancer au moins une fois par mois, et après chaque changement de version de PostgreSQL. Une sauvegarde
# jamais restaurée n'est pas une sauvegarde.
set -euo pipefail

fichier="${1:?chemin de la sauvegarde (.dump.gpg)}"
: "${SAUVEGARDE_PHRASE:?SAUVEGARDE_PHRASE manquante}"
conteneur="kwaba-test-restauration-$$"
mot_de_passe="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"

nettoyer() { docker rm -f "$conteneur" >/dev/null 2>&1 || true; }
trap nettoyer EXIT

docker run -d --name "$conteneur" -e POSTGRES_PASSWORD="$mot_de_passe" -e POSTGRES_DB=restauration "postgres:${PG_VERSION:-16}-bookworm" >/dev/null
until docker exec "$conteneur" pg_isready -U postgres -d restauration >/dev/null 2>&1; do sleep 1; done

gpg --batch --quiet --decrypt --passphrase-fd 3 "$fichier" 3<<<"$SAUVEGARDE_PHRASE" \
  | docker exec -i "$conteneur" pg_restore --no-owner --no-privileges --exit-on-error -U postgres -d restauration

requete() { docker exec "$conteneur" psql -U postgres -d restauration -tAc "$1"; }

echo "Migrations appliquées : $(requete 'SELECT count(*) FROM django_migrations')"
echo "Utilisateurs          : $(requete 'SELECT count(*) FROM users_user')"
echo "Hébergements          : $(requete 'SELECT count(*) FROM hebergements_hebergementmodel' 2>/dev/null || echo '?')"
echo "Réservations          : $(requete 'SELECT count(*) FROM reservations_reservationmodel' 2>/dev/null || echo '?')"
echo "Dernière réservation  : $(requete 'SELECT max(created_at) FROM reservations_reservationmodel' 2>/dev/null || echo '?')"

if [ "$(requete 'SELECT count(*) FROM users_user')" -eq 0 ]; then
  echo "ERREUR : aucun utilisateur restauré" >&2
  exit 1
fi
echo "Restauration réussie."
