# Titre:
Vision cible orientée microservices

# Status:
Accepté

# Contexte :
Le projet n'est pas déployé comme un ensemble de microservices aujourd'hui, mais certains choix de modélisation et de communication sont déjà pensés pour une évolution vers cette cible.


# Options
## Option 1 : 
Rester durablement sur une architecture monolithique classique.
## Option 2 : 
Concevoir des frontières modulaires préparées à une évolution vers des microservices.

# Décision
Nous retenons une vision cible orientée microservices, sans imposer dès maintenant une distribution physique des composants.

# Conséquences :
## positives (bénéfices)
- Anticipation des frontières métier.
- Meilleure discipline dans le découpage des modules.

## négatifs (inconvénients)
- Risque de sur-conception si la cible est poursuivie trop tôt.
- Nécessité de documenter clairement ce qui est cible et ce qui est présent aujourd'hui.

## Impacts futurs
- Certaines décisions devront être réévaluées au moment d'une extraction effective en services séparés.
