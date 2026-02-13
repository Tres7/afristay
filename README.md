# AfriStay

**L'Afrique a portee de clic**

Plateforme de reservation d'hebergements en Afrique avec support des paiements Mobile Money.

## Stack technique

| Couche   | Technologie                        |
|----------|------------------------------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend  | Django 5.1, Django REST Framework  |
| Base de donnees | PostgreSQL 16                |
| Infra    | Docker, Docker Compose             |

## Pre-requis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installe et demarre
- Git

## Installation

### 1. Cloner le repo

```bash
git clone https://github.com/Tres7/afristay.git
cd afristay
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Editez le fichier `.env` avec vos propres valeurs.

### 3. Lancer tous les services

```bash
docker compose up --build
```

### 4. Initialiser la base de donnees

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

## Acces aux services

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000         |
| Backend   | http://localhost:8000         |
| Admin Django | http://localhost:8000/admin |
| pgAdmin   | http://localhost:5051         |

## Structure du projet

```
afristay/
├── client/                 # Frontend Next.js
│   ├── src/
│   │   └── app/            # App Router (pages, layouts)
│   ├── public/             # Assets statiques
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
├── server/                 # Backend Django
│   ├── config/             # Configuration Django (settings, urls)
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── documentation/          # Documentation du projet
├── compose.yaml            # Docker Compose (tous les services)
├── .env.example            # Template des variables d'environnement
└── .gitignore
```

## Git Flow

| Branche      | Usage                     |
|--------------|---------------------------|
| `main`       | Production                |
| `develop`    | Integration               |
| `feature/*`  | Nouvelles fonctionnalites |
| `hotfix/*`   | Corrections urgentes      |

## Commandes utiles

```bash
# Demarrer les services
docker compose up -d

# Arreter les services
docker compose down

# Voir les logs
docker compose logs -f backend
docker compose logs -f frontend

# Creer une migration Django
docker compose exec backend python manage.py makemigrations

# Appliquer les migrations
docker compose exec backend python manage.py migrate

# Installer un package Python
docker compose exec backend pip install <package>
# Puis mettre a jour requirements.txt

# Installer un package npm
docker compose exec frontend npm install <package>
```
