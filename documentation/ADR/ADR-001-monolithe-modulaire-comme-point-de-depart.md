# Titre:
Choix d'un monolithe modulaire comme point de départ

# Status:
Accepté

# Contexte :
L'équipe projet étant constituée de deux développeurs au début, il serait très compliqué de commencer le projet par une architecture distribuée. L'équipe veut conserver un codebase unique tout en préparant une séparation métier claire entre les modules.


# Options
## Option 1 : 
Commencer directement avec des microservices distribués.
## Option 2 : 
Adopter un monolithe modulaire comme base initiale.

# Décision
Nous commençons avec un monolithe modulaire afin de limiter la complexité de déploiement, de débogage et de coordination, tout en préparant une évolution vers des frontières métier plus explicites.

# Conséquences :
## positives (bénéfices)
- Mise en route plus rapide.
- Débogage plus simple.
- Cohésion du codebase initial.

## négatifs (inconvénients)
- Risque de couplage si les frontières modulaires ne sont pas respectées.
- Évolution vers des microservices non automatique.

## Impacts futurs
- Les modules devront conserver des contrats clairs pour faciliter une extraction ultérieure.
