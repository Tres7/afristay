# Titre:
Envoi asynchrone des emails de vérification

# Status:
Accepté

# Contexte :
Le flux d'inscription ne doit pas bloquer l'utilisateur pendant l'envoi de l'email de vérification. L'objectif principal est d'améliorer la fluidité perçue du parcours d'inscription.
.

# Options
Option 1 : Envoyer l'email de vérification de manière synchrone dans la requête HTTP.
Option 2 : Publier un événement puis déléguer l'envoi à un consumer.

# Décision
Nous retenons l'envoi asynchrone des emails de vérification afin que l'utilisateur puisse être redirigé rapidement vers l'étape de saisie du code.

# Conséquences :
positives (bénéfices)
- Meilleure expérience utilisateur.
- Temps de réponse HTTP réduit.
- Découplage entre inscription et notification.

négatifs (inconvénients)
- Le parcours dépend du broker et du consumer.
- Les échecs d'envoi ne sont plus visibles directement dans la requête initiale.

Impacts futurs
- La documentation et la supervision doivent rendre cette dépendance explicite.
