# Titre:
Usage de l'Event-Driven Architecture pour certains workflows

# Status:
Accepté

# Contexte :
Certaines opérations, comme l'envoi de notifications, gagnent à être découplées du cycle HTTP principal. L'équipe souhaite réserver l'approche événementielle aux cas où elle apporte une vraie valeur.


# Options
Option 1 : Garder tous les workflows en synchrone.
Option 2 : Introduire une approche événementielle sur certains cas d'usage.

# Décision
Nous utilisons une approche orientée événements pour les workflows qui bénéficient d'un découplage temporel ou technique, sans l'imposer systématiquement partout.

# Conséquences :
positives (bénéfices)
- Meilleur découplage entre producteurs et consommateurs.
- Possibilité de traitements asynchrones.

négatifs (inconvénients)
- Observabilité plus complexe.
- Gestion des erreurs plus subtile.

Impacts futurs
- Il faudra clarifier les cas où un événement est préféré à un appel direct.
