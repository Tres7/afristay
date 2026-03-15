# Titre:
Centralisation de la configuration par variables d'environnement

# Status:
Accepté

# Contexte :
Le projet s'appuie sur Docker, Next.js et Django. Plusieurs services ont besoin de configuration sans hardcoder les valeurs sensibles ou spécifiques à un environnement.
.

# Options
Option 1 : Hardcoder la configuration dans le code ou les manifests.
Option 2 : Utiliser les variables d'environnement comme mécanisme principal de configuration.

# Décision
Nous centralisons la configuration via des variables d'environnement, avec des fichiers d'exemple dédiés aux différents runtimes.

# Conséquences :
positives (bénéfices)
- Configuration plus portable.
- Meilleure séparation entre code et secrets.
- Facilité de paramétrage selon les environnements.

négatifs (inconvénients)
- Risque de confusion si les conventions de nommage ne sont pas stabilisées.
- Documentation obligatoire pour les nouvelles variables.

Impacts futurs
- Les stratégies de `.env` et de templates devront rester cohérentes entre frontend et backend.
