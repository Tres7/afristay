# Titre:
Notifications traitées hors du cycle HTTP

# Status:
Accepté

# Contexte :
Les notifications, en particulier l'email, ne sont pas critiques pour produire la réponse HTTP initiale. Les traiter hors du cycle HTTP permet d'améliorer la réactivité perçue.
.

# Options
Option 1 : Traiter les notifications dans la requête HTTP initiale.
Option 2 : Traiter les notifications en dehors du cycle HTTP.

# Décision
Nous traitons les notifications hors du cycle HTTP lorsque cela n'empêche pas la cohérence métier du flux principal.

# Conséquences :
positives (bénéfices)
- Réponses HTTP plus rapides.
- Meilleure tolérance aux latences des services externes.

négatifs (inconvénients)
- Le succès du flux utilisateur peut dépendre d'un traitement ultérieur.
- Les erreurs sont plus différées.

Impacts futurs
- L'observabilité des notifications devra être renforcée si de nouveaux canaux sont ajoutés.
