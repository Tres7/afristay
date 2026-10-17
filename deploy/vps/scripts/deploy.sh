#!/usr/bin/env bash
# Deploys a manifest: scripts/deploy.sh <manifest> <server image> <client image>
# Fixed order: backup, images, migrations, server and workers, client, nginx, health check.
source "$(dirname "$0")/lib.sh"

manifest=${1:?usage: deploy.sh <manifest> <image serveur> <image client>}
server_image=${2:?image serveur manquante}
client_image=${3:?image client manquante}
domain=${KWABA_DOMAIN:-kwa-ba.com}
# Local trials only: published HTTPS port, curl options (self-signed certificate), images already present
https_port=${HTTPS_PORT:-443}
read -r -a health_curl_opts <<< "${KWABA_HEALTH_CURL_OPTS:-}"

require_env_files
if ! kwaba_compose --profile tools run --rm --entrypoint test certbot -s "/etc/letsencrypt/live/${domain}/fullchain.pem"; then
  echo "Pas de certificat pour ${domain} : lancer d'abord scripts/init-tls.sh" >&2
  exit 1
fi

export KWABA_ENV_FILE=.deploy.env.next
printf 'SERVER_IMAGE=%s\nCLIENT_IMAGE=%s\nMANIFEST=%s\n' "$server_image" "$client_image" "$manifest" > "$KWABA_ENV_FILE"

log "Déploiement de ${manifest}"
log "Images"
if [ "${KWABA_SKIP_PULL:-0}" != "1" ]; then kwaba_compose pull api client; fi

log "Base et broker"
kwaba_compose up -d --wait postgres rabbitmq

log "Sauvegarde de la base avant migrations"
scripts/backup.sh "avant-${manifest%.yaml}"

log "Migrations"
kwaba_compose run --rm --no-deps api python manage.py migrate --noinput

log "Serveur et workers"
kwaba_compose up -d --wait api consumer relay payments

log "Client"
kwaba_compose up -d --wait client

log "nginx (configuration vérifiée, puis conteneur recréé : templates et adresses de l'API et du client à jour)"
# The template is rendered and tested in a throwaway container before replacing the running nginx
kwaba_compose run --rm --no-deps nginx nginx -t
kwaba_compose up -d --force-recreate nginx

log "Test de santé"
check() {
  curl -fsS --retry 10 --retry-delay 3 --retry-all-errors "${health_curl_opts[@]}" \
    --resolve "${domain}:${https_port}:127.0.0.1" -o /dev/null -w "%{http_code} $1\n" "https://${domain}:${https_port}$1"
}
check /api/health/
check /

[ -f .deploy.env ] && cp .deploy.env .deploy.env.previous
mv "$KWABA_ENV_FILE" .deploy.env
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${manifest} ${server_image} ${client_image}" >> deployments.log
log "Déployé : ${manifest}"
