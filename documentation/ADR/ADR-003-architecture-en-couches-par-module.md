# Titre:
Adoption d'une architecture en couches pour structurer les modules

# Status:
Accepté

# Contexte :
Le code est organisé autour de couches telles que domain, application et infrastructure. Cette structuration vise à mieux séparer les responsabilités au sein de chaque module métier.
.

# Options
Option 1 : Organiser les modules sans couches explicites.
Option 2 : Adopter une architecture en couches par module.

# Décision
Nous adoptons une architecture en couches par module afin de distinguer clairement la logique métier, les cas d'usage et les détails techniques.

# Conséquences :
positives (bénéfices)
- Lisibilité accrue du code.
- Séparation plus nette des responsabilités.
- Facilité de maintenance par module.

négatifs (inconvénients)
- Structure plus verbeuse.
- Risque de couches artificielles si elles sont appliquées sans discernement.

Impacts futurs
- Les conventions de nommage et de placement devront rester homogènes entre les modules.
