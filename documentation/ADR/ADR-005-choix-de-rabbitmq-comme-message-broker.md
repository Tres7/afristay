# Titre:
Choix de RabbitMQ comme message broker

# Status:
Accepté

# Contexte :
L'application a besoin d'un broker pour transporter des messages entre producteurs et consommateurs, en particulier pour certains traitements asynchrones.
.

# Options
Option 1 : Ne pas utiliser de broker et rester en traitement synchrone.
Option 2 : Utiliser RabbitMQ comme broker.
Option 3 : Choisir un autre système de messagerie.

# Décision
Nous choisissons RabbitMQ comme message broker pour supporter les workflows asynchrones de l'application.

# Conséquences :
positives (bénéfices)
- Broker mature et bien adapté aux files et routages.
- Bon support des consommateurs asynchrones.

négatifs (inconvénients)
- Introduction d'une dépendance d'infrastructure supplémentaire.
- Besoin de supervision et de configuration.

Impacts futurs
- RabbitMQ pourra servir à d'autres événements métier au-delà des emails.
