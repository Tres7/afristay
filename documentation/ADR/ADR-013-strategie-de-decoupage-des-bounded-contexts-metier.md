# Titre:
Stratégie de découpage des bounded contexts métier

# Status:
Accepté

# Contexte :
Le projet couvre plusieurs domaines métier comme les utilisateurs, les hébergements, les réservations et les notifications. Leur séparation conceptuelle doit être explicite pour soutenir l'évolution de l'architecture.
.

# Options
Option 1 : Structurer le code sans bounded contexts explicites.
Option 2 : Identifier et conserver des bounded contexts métier distincts.

# Décision
Nous structurons le projet autour de bounded contexts métier explicites afin de clarifier les responsabilités et les frontières fonctionnelles.

# Conséquences :
positives (bénéfices)
- Meilleure lisibilité du domaine.
- Frontières métier plus stables.
- Préparation utile à une évolution d'architecture.

négatifs (inconvénients)
- Demande une vigilance sur les dépendances transverses.
- Le découpage peut devoir être ajusté avec la croissance du produit.

Impacts futurs
- Les contrats inter-contextes devront rester clairs et documentés.
