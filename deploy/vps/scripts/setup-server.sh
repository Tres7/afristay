#!/usr/bin/env bash
# One-time initial setup of the VPS (Ubuntu 24.04 LTS), as root, interactively (it asks for the admin's password):
#   scp deploy/vps/scripts/setup-server.sh root@<ip>:/root/
#   ssh -t root@<ip> bash /root/setup-server.sh <admin user>
#
# Prerequisite: your public SSH key in /root/.ssh/authorized_keys. The script stops otherwise, because it disables
# password and root logins. Keep your session open until you have checked, in another terminal, that
# "ssh <admin user>@<ip>" and "sudo whoami" work.
#
# Users:
#   <admin user>  your personal account: SSH key copied from root, sudo with a password (system administration).
#   deploy        used only by the CI/CD (docker group, no sudo); its dedicated SSH key is added afterwards.
# Result: Docker, /opt/kwaba, firewall (22 rate limited, 80, 443), fail2ban, automatic security updates with a
# night reboot, 2 GB of swap, scheduled tasks, key-only SSH restricted to those two users.
set -euo pipefail

log() { echo "==> $*"; }

admin=${1:?usage: setup-server.sh <utilisateur admin>}
[ "$(id -u)" = 0 ] || { echo "À lancer en root" >&2; exit 1; }
[ -t 0 ] || { echo "Session interactive requise (ssh -t) : le mot de passe sudo de ${admin} est demandé" >&2; exit 1; }
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
apt-get -y -q full-upgrade
apt-get install -y -q ca-certificates curl ufw fail2ban python3-systemd unattended-upgrades age rsync

log "Administrateur ${admin} (sudo, clé SSH de root)"
id "$admin" > /dev/null 2>&1 || adduser --disabled-password --gecos "" "$admin"
usermod -aG sudo "$admin"
install -d -m 700 -o "$admin" -g "$admin" "/home/${admin}/.ssh"
install -m 600 -o "$admin" -g "$admin" /root/.ssh/authorized_keys "/home/${admin}/.ssh/authorized_keys"
echo "Choisis le mot de passe sudo de ${admin} (demandé par sudo, jamais utilisé pour SSH) :"
passwd "$admin"

log "Docker (dépôt officiel ; à mettre à jour à la main chaque mois : apt upgrade)"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
# live-restore: containers keep running while the Docker daemon itself is restarted or upgraded
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "local", "log-opts": { "max-size": "10m", "max-file": "3" }, "live-restore": true }
EOF
systemctl enable docker
systemctl restart docker

log "Utilisateur deploy (CI/CD uniquement, sans sudo) et /opt/kwaba"
# The docker group is root-equivalent: only deploy gets it, and its key is dedicated to the CI (added afterwards)
id deploy > /dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
[ -f /home/deploy/.ssh/authorized_keys ] || install -m 600 -o deploy -g deploy /dev/null /home/deploy/.ssh/authorized_keys
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

log "Pare-feu : SSH (limité en débit), HTTP, HTTPS"
# Docker bypasses ufw for published ports: compose.yml publishes only 80 and 443 (nginx)
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw limit 22/tcp > /dev/null
# Without the kernel's xt_recent module, ufw silently skips "limit" rules: fall back to a plain allow
ufw show added | grep -q '22/tcp' || ufw allow 22/tcp > /dev/null
ufw allow 80/tcp > /dev/null
ufw allow 443/tcp > /dev/null
# Never enable the firewall without an SSH rule: that would lock us out
ufw show added | grep -q '22/tcp' || { echo "Aucune règle SSH dans ufw : pare-feu non activé" >&2; exit 1; }
ufw --force enable > /dev/null
ufw status | grep -q '^22/tcp' || { echo "Le port 22 n'est pas ouvert dans ufw : ne ferme pas cette session" >&2; exit 1; }

log "fail2ban (SSH)"
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 4
bantime = 1h
EOF
systemctl enable fail2ban > /dev/null
systemctl restart fail2ban

log "Mises à jour de sécurité automatiques, redémarrage la nuit si nécessaire"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
# After the 03:30 backup and the 04:00 token purge; containers restart on their own (restart: unless-stopped)
cat > /etc/apt/apt.conf.d/52kwaba-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF

log "Tâches planifiées (heure du serveur : UTC)"
cat > /etc/cron.d/kwaba <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
# Daily database backup (local, plus an encrypted copy on R2 when configured)
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

log "SSH : clé uniquement, root interdit, utilisateurs ${admin} et deploy seulement"
# "00-": sshd keeps the first value it reads, before 50-cloud-init.conf which may re-enable passwords
cat > /etc/ssh/sshd_config.d/00-kwaba-hardening.conf <<EOF
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
AuthenticationMethods publickey
AllowUsers ${admin} deploy
MaxAuthTries 3
LoginGraceTime 20
X11Forwarding no
AllowAgentForwarding no
EOF
sshd -t
systemctl reload ssh 2> /dev/null || systemctl restart ssh
effective=$(sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication) ')
echo "$effective"
if echo "$effective" | grep -vqE ' no$'; then
  echo "La configuration SSH appliquée n'est pas celle attendue : vérifie /etc/ssh/sshd_config.d/" >&2
  exit 1
fi

log "Terminé. NE FERME PAS cette session : vérifie d'abord, dans un autre terminal,
    ssh ${admin}@<ip>   puis   sudo whoami   (doit répondre root)"
