# Production Kwa-Ba sur le VPS

Tout tourne sur un seul VPS (Ubuntu 24.04), en Docker Compose, dans `/opt/kwaba` :

| Service | Rôle | Exposé |
| --- | --- | --- |
| `nginx` | HTTPS (Let's Encrypt), redirections, routage : `/api/auth/*` → client, `/api/*` `/admin/*` `/static/*` → API, le reste → client | 80, 443 |
| `client` | Site Next.js (image `afristay-client`, par digest) | non |
| `api` | API Django / Gunicorn (image `afristay-server`, par digest) | non |
| `consumer`, `relay`, `payments` | Emails (RabbitMQ), relais de la messagerie, worker des paiements (même image que l'API) | non |
| `postgres`, `rabbitmq` | Base et broker, volumes persistants | non |

Les photos sont sur Cloudflare R2. Les images GHCR sont publiques (dépôt public) : aucune authentification sur le VPS.

## Préparation initiale (une seule fois)

1. **DNS** : enregistrements A (et AAAA si IPv6) de `kwa-ba.com` et `www.kwa-ba.com` vers l'IP du VPS. Dans le panneau IONOS, vérifier que la politique de pare-feu du VPS autorise 22, 80 et 443.
2. **Clé SSH** : depuis ton poste, `ssh-copy-id root@<ip>` (connexion par mot de passe une dernière fois).
3. **Durcissement et Docker** :
   ```bash
   scp deploy/vps/scripts/setup-server.sh root@<ip>:/root/
   ssh root@<ip> bash /root/setup-server.sh
   ```
   **Ne ferme pas cette session** avant d'avoir vérifié, dans un autre terminal, que `ssh deploy@<ip>` fonctionne : le script interdit root et les mots de passe.
4. **Fichiers** : copier `deploy/vps/` dans `/opt/kwaba` (le workflow `deploy` le refait à chaque déploiement) :
   ```bash
   rsync -a --exclude env/*.env deploy/vps/ deploy@<ip>:/opt/kwaba/
   ```
5. **Secrets** : sur le VPS, dans `/opt/kwaba/env/`, créer `server.env`, `client.env`, `postgres.env`, `rabbitmq.env` et `backup.env` à partir des modèles `*.env.example`, puis `chmod 600 env/*.env`. Ils ne quittent jamais le serveur.
6. **Certificat** : une fois le DNS propagé (`dig +short kwa-ba.com` renvoie l'IP du VPS) :
   ```bash
   ssh deploy@<ip> /opt/kwaba/scripts/init-tls.sh info@kwa-ba.com
   ```
7. **Premier déploiement** : workflow `deploy` (voir ci-dessous).

## Déployer

Workflow GitHub **deploy** (lancement manuel, avec approbation) : champ *manifest* vide pour le dernier, ou un nom de fichier de `deploy/manifests/`. Il appelle sur le VPS :

```bash
scripts/deploy.sh <manifest> <image serveur> <image client>
```

Ordre fixe : sauvegarde de la base (vérifiée), images, migrations, serveur et workers, client, rechargement de nginx, test de santé (`/api/health/` et `/`). L'état déployé est dans `.deploy.env` (le précédent dans `.deploy.env.previous`), l'historique dans `deployments.log`.

## Revenir en arrière

Relancer le workflow **deploy** avec un manifest antérieur. Les migrations ne sont pas annulées : elles doivent rester rétro-compatibles (ajouter avant de supprimer), ce qui permet à l'ancien code de tourner sur le nouveau schéma.

## Sauvegardes et restauration

- Automatiques : chaque nuit (03:30 UTC) et avant chaque déploiement, dans `/opt/kwaba/backups` (14 jours), copiées sur R2 si `env/backup.env` est rempli.
- Restaurer (après avoir arrêté l'API et les workers) :
  ```bash
  cd /opt/kwaba
  docker compose --env-file .deploy.env stop api consumer relay payments
  docker compose --env-file .deploy.env exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
  docker compose --env-file .deploy.env exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' < backups/<fichier>.dump
  docker compose --env-file .deploy.env up -d --wait api consumer relay payments
  ```

## Tâches planifiées (`/etc/cron.d/kwaba`)

| Heure (UTC) | Tâche |
| --- | --- |
| 03:30 | `scripts/backup.sh` |
| 04:00 | `scripts/maintenance.sh flush-tokens` (jetons JWT expirés) |
| 02:17 et 14:17 | `scripts/maintenance.sh renew-certs` |

Journaux dans `/opt/kwaba/logs/` (rotation hebdomadaire).

## Essai local de la pile de production

Toute la chaîne se teste sur un poste avec Docker, sans VPS : images construites localement, secrets de test, certificat auto-signé, ports décalés.

```bash
export COMPOSE_PROJECT_NAME=kwabatest HTTP_PORT=18080 HTTPS_PORT=18443
KWABA_SKIP_PULL=1 KWABA_HEALTH_CURL_OPTS=-k scripts/deploy.sh essai afristay-server:prod afristay-client:prod
```

En développement (`compose.yaml` à la racine), RabbitMQ est en version 4 : si un ancien volume RabbitMQ 3 l'empêche de démarrer, supprimer ce volume de développement (`docker volume rm afristay_rabbitmq_data`).
