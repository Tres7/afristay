#!/usr/bin/env bash
# Scheduled tasks (cron): scripts/maintenance.sh flush-tokens | renew-certs
source "$(dirname "$0")/lib.sh"

case "${1:-}" in
  flush-tokens)
    # Expired JWT tokens of the blacklist (otherwise the table grows with every login)
    [ -f .deploy.env ] || { log "Pas encore déployé"; exit 0; }
    kwaba_compose run --rm --no-deps api python manage.py flushexpiredtokens
    log "Jetons expirés purgés"
    ;;
  renew-certs)
    kwaba_compose --profile tools run --rm certbot renew --webroot -w /var/www/certbot --quiet
    if [ -f .deploy.env ]; then kwaba_compose exec -T nginx nginx -s reload; fi
    log "Certificats vérifiés"
    ;;
  *)
    echo "usage: maintenance.sh flush-tokens | renew-certs" >&2
    exit 2
    ;;
esac
