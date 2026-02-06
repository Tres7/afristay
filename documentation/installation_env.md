# Partie bd
Créer au début un fichier .env et le mettre directement dans le .gitignore pour éviter de le commiter
A mettre dans le .env:
```env
POSTGRES_DB=changeMe
POSTGRES_USER=changeMe
POSTGRES_PASSWORD=changeMe

PGADMIN_EMAIL=changeMe@changeMe.changeMe.com
PGADMIN_PASSWORD=changeMe

```
Vous devez adapter les valeurs à votre convenance.
L'email doit respecter: changeMe@changeMe.changeMe.com
## Installation de pgAdmin et Postgres
```bash
docker compose up -d
```
## Arrêter les containers
```bash
docker compose down ou docker stop nom_container
```
## Accès à Pgadmin dans le navigateur: localhost:port_mis_dans_le_docker_compose
## Configuration de la connexion au serveur postgres
Nouveau serveur
Le port est celui que vous avez mis dans le docker compose pour postgres (le container)
![img.png](img.png)
![img_1.png](img_1.png)
