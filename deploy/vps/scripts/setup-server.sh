#!/usr/bin/env bash
# One-time initial setup of the VPS (Ubuntu 24.04 LTS), as root:
#   scp deploy/vps/scripts/setup-server.sh root@<ip>:/root/
#   ssh root@<ip> bash /root/setup-server.sh
#
# Prerequisite: your public SSH key in /root/.ssh/authorized_keys. The script stops otherwise, because it disables
# password and root logins. Keep your session open until you have checked, in another terminal, that
# "ssh deploy@<ip>" works.
#
# Result: Docker, deploy user (docker group), /opt/kwaba, firewall (22, 80, 443), fail2ban,
# automatic security updates, 2 GB of swap, scheduled tasks, key-only SSH.
set -euo pipefail

log() { echo "==> $*"; }

[ "$(id -u)" = 0 ] || { echo "À lancer en root" >&2; exit 1; }
# shellcheck source=/dev/null
. /etc/os-release
[ "$ID" = ubuntu ] || echo "Attention : prévu pour Ubuntu 24.04, système détecté : $PRETTY_NAME" >&2
if [ ! -s /root/.ssh/authorized_keys ]; then
  echo "Aucune clé dans /root/.ssh/authorized_keys : ajoute ta clé publique avant (ssh-copy-id root@<ip>)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log "Mises à jour et paquets de base"
apt-get update -q
apt-get -y -q upgrade
apt-get install -y -q ca-certificates curl ufw fail2ban unattended-upgrades

log "Docker (dépôt officiel)"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl enable docker
systemctl restart docker

log "Utilisateur deploy et /opt/kwaba"
id deploy > /dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
install -d -m 755 -o deploy -g deploy /opt/kwaba /opt/kwaba/logs
install -d -m 700 -o deploy -g deploy /opt/kwaba/env

log "Swap de 2 Go"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile > /dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/90-kwaba.conf
sysctl -q --system

log "Pare-feu : SSH, HTTP, HTTPS uniquement"
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow OpenSSH > /dev/null
ufw allow 80/tcp > /dev/null
ufw allow 443/tcp > /dev/null
ufw --force enable > /dev/null

log "fail2ban et mises à jour de sécurité automatiques"
systemctl enable --now fail2ban > /dev/null
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

log "Tâches planifiées (heure du serveur : UTC)"
cat > /etc/cron.d/kwaba <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
# Daily database backup (local, plus R2 when configured)
30 3 * * * deploy /opt/kwaba/scripts/backup.sh quotidienne >> /opt/kwaba/logs/backup.log 2>&1
# Purge expired JWT tokens
0 4 * * * deploy /opt/kwaba/scripts/maintenance.sh flush-tokens >> /opt/kwaba/logs/maintenance.log 2>&1
# Let's Encrypt certificate renewal (no-op until they are close to expiry)
17 2,14 * * * deploy /opt/kwaba/scripts/maintenance.sh renew-certs >> /opt/kwaba/logs/maintenance.log 2>&1
EOF
chmod 644 /etc/cron.d/kwaba
cat > /etc/logrotate.d/kwaba <<'EOF'
/opt/kwaba/logs/*.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
EOF

log "SSH : connexion par clé uniquement, root interdit"
cat > /etc/ssh/sshd_config.d/10-kwaba.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sshd -t
systemctl reload ssh 2> /dev/null || systemctl restart ssh

log "Terminé. NE FERME PAS cette session : vérifie d'abord dans un autre terminal que « ssh deploy@<ip> » fonctionne."
