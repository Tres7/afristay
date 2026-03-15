# Titre:
Persistance initiale centralisée dans PostgreSQL

# Status:
Accepté

# Contexte :
Le projet démarre avec une persistance centralisée afin de limiter la complexité initiale. Une seule base permet de simplifier l'outillage, les migrations et l'exploitation.
.

# Options
Option 1 : Utiliser des stockages différents selon les modules dès le départ.
Option 2 : Centraliser la persistance initiale dans PostgreSQL.

# Décision
Nous retenons PostgreSQL comme base principale unique pour la phase actuelle du projet.

# Conséquences :
positives (bénéfices)
- Outillage simple et stable.
- Migrations plus faciles à gérer.
- Cohésion des données initiales.

négatifs (inconvénients)
- Couplage plus fort autour d'une base unique.
- Frontières de données moins strictes qu'en architecture distribuée.

Impacts futurs
- Une évolution vers des stockages séparés devra être justifiée par des besoins réels.
