# Titre:
Gestion de la vérification email par code temporaire

# Status:
Accepté

# Contexte :
L'application doit vérifier l'adresse email d'un utilisateur après son inscription. Le mécanisme retenu doit être simple à présenter dans le parcours produit et à valider côté backend.
.

# Options
Option 1 : Utiliser un code temporaire stocké et validé côté backend.
Option 2 : Utiliser un lien signé envoyé par email.

# Décision
Nous utilisons un code temporaire de vérification email, stocké temporairement et vérifié par le backend.

# Conséquences :
positives (bénéfices)
- Parcours utilisateur simple à comprendre.
- Validation explicite côté interface.

négatifs (inconvénients)
- Besoin de stockage temporaire du code.
- Gestion de l'expiration et de la ré-émission.

Impacts futurs
- Le mécanisme pourra être comparé plus tard à une approche par lien signé selon les besoins produit.
