#!/usr/bin/env bash
# Vérifie qu'une sauvegarde se restaure vraiment : restauration dans un PostgreSQL jetable (Docker), jamais dans
# la base de production, puis comptage des lignes.
#
# Usage : deploy/scripts/test-restauration.sh <fichier.dump>
#   Sauvegardes produites par deploy/vps/scripts/backup.sh (format personnalisé de pg_dump, /opt/kwaba/backups).
#   PG_VERSION : version majeure du conteneur de restauration (16 par défaut, celle de la production) ; elle doit être
#   au moins égale à celle du pg_dump qui a produit la sauvegarde.
# À lancer au moins une fois par mois, et après chaque changement de version de PostgreSQL. Une sauvegarde
# jamais restaurée n'est pas une sauvegarde.
set -euo pipefail

fichier="${1:?chemin de la sauvegarde (.dump)}"
conteneur="kwaba-test-restauration-$$"
mot_de_passe="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"

nettoyer() { docker rm -f "$conteneur" >/dev/null 2>&1 || true; }
trap nettoyer EXIT

docker run -d --name "$conteneur" -e POSTGRES_PASSWORD="$mot_de_passe" -e POSTGRES_DB=restauration \
  "postgres:${PG_VERSION:-16}-alpine" >/dev/null
for _ in $(seq 1 60); do
  # TCP : le serveur temporaire de l'initialisation n'écoute que sur le socket local, puis redémarre
  docker exec "$conteneur" pg_isready -h 127.0.0.1 -U postgres -d restauration >/dev/null 2>&1 && break
  sleep 1
done

docker exec -i "$conteneur" pg_restore -h 127.0.0.1 --no-owner --no-privileges --exit-on-error -U postgres -d restauration < "$fichier"

requete() { docker exec "$conteneur" psql -h 127.0.0.1 -U postgres -d restauration -tAc "$1"; }
utilisateurs=$(requete 'SELECT count(*) FROM users_user')
echo "Migrations appliquées : $(requete 'SELECT count(*) FROM django_migrations')"
echo "Utilisateurs          : ${utilisateurs}"
echo "Hébergements          : $(requete 'SELECT count(*) FROM hebergements_hebergementmodel')"
echo "Réservations          : $(requete 'SELECT count(*) FROM reservations_reservationmodel')"

if [ "$utilisateurs" -eq 0 ]; then
  echo "ERREUR : aucun utilisateur restauré" >&2
  exit 1
fi
echo "Restauration réussie."
