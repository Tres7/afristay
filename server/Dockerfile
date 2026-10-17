FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# Utilisateur sans privilèges : l'application ne tourne jamais en root
RUN useradd --create-home --uid 10001 --user-group app

# Toutes les dépendances ont des wheels (psycopg2-binary, Pillow…) : ni compilateur ni paquets système
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Fichiers statiques (admin) servis par WhiteNoise ; clé et mot de passe factices, utilisés seulement le temps du build
RUN DJANGO_SECRET_KEY=collectstatic-build-only POSTGRES_PASSWORD=collectstatic-build-only python manage.py collectstatic --noinput \
    && mkdir -p mediafiles prive && chown app:app mediafiles prive

USER 10001:10001

EXPOSE 8000

# API par défaut. Le consumer, le relais et les migrations utilisent la même image avec une autre commande.
# Render fournit PORT ; WEB_CONCURRENCY règle le nombre de workers Gunicorn.
# FORWARDED_ALLOW_IPS : adresses des proxys dont Gunicorn accepte les en-têtes X-Forwarded-* (par défaut aucun
# sauf la machine elle-même). Derrière le proxy de Render, dont l'adresse varie, mettre « * » dans l'environnement
# du service, avec DJANGO_NUM_PROXIES=1.
ENV FORWARDED_ALLOW_IPS=127.0.0.1
CMD ["sh", "-c", "exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers ${WEB_CONCURRENCY:-2} --access-logfile - --forwarded-allow-ips \"${FORWARDED_ALLOW_IPS}\""]
