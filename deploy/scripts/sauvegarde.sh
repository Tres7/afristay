#!/usr/bin/env bash
# Sauvegarde chiffrée de la base PostgreSQL de production.
#
# Usage : DATABASE_URL=postgresql://... SAUVEGARDE_PHRASE=... deploy/scripts/sauvegarde.sh [dossier]
#   (ou, sans DATABASE_URL, les variables standard de PostgreSQL : PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
#   - format personnalisé de pg_dump (-Fc) : compressé, restaurable table par table avec pg_restore ;
#   - chiffré avec GPG (AES-256, phrase secrète SAUVEGARDE_PHRASE, conservée dans le gestionnaire de mots de passe
#     de l'équipe, jamais à côté des sauvegardes) : une sauvegarde volée ne révèle rien ;
#   - conserve les SAUVEGARDE_JOURS derniers jours (14 par défaut).
# À lancer chaque nuit (cron du VPS ou tâche planifiée), puis copier le dossier hors du serveur (R2, autre hébergeur).
# La restauration est testée par deploy/scripts/test-restauration.sh.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ] && [ -z "${PGDATABASE:-}" ]; then
  echo "DATABASE_URL ou PGDATABASE manquante" >&2
  exit 1
fi
: "${SAUVEGARDE_PHRASE:?SAUVEGARDE_PHRASE manquante}"
dossier="${1:-./sauvegardes}"
jours="${SAUVEGARDE_JOURS:-14}"

mkdir -p "$dossier"
chmod 700 "$dossier"
fichier="$dossier/kwaba-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"

# --no-owner / --no-privileges : restaurable sur une autre base, avec d'autres rôles
pg_dump --format=custom --no-owner --no-privileges ${DATABASE_URL:+"$DATABASE_URL"} \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-fd 3 --output "$fichier" 3<<<"$SAUVEGARDE_PHRASE"
chmod 600 "$fichier"

# Une sauvegarde vide ou tronquée ne doit pas passer inaperçue
taille=$(wc -c <"$fichier")
if [ "$taille" -lt 10000 ]; then
  echo "ERREUR : sauvegarde anormalement petite ($taille octets) : $fichier" >&2
  exit 1
fi

find "$dossier" -name 'kwaba-*.dump.gpg' -mtime +"$jours" -delete
echo "Sauvegarde : $fichier ($taille octets)"
