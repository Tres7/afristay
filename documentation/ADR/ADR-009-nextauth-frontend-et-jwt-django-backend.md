# Titre:
Stratégie d'authentification avec NextAuth côté frontend et JWT Django côté backend

# Status:
Accepté

# Contexte :
Le frontend et le backend n'assument pas exactement les mêmes responsabilités d'authentification. Le frontend gère l'expérience de session, tandis que le backend émet et vérifie les jetons métier.
.

# Options
Option 1 : Centraliser toute l'authentification d'un seul côté.
Option 2 : Utiliser NextAuth pour la session frontend et JWT Django pour le backend.

# Décision
Nous retenons une combinaison NextAuth côté frontend et JWT côté backend afin de séparer la gestion de session frontend de l'authentification métier backend.

# Conséquences :
positives (bénéfices)
- Bonne intégration avec Next.js côté frontend.
- Conservation d'un backend autonome pour l'authentification métier.

négatifs (inconvénients)
- Configuration plus subtile.
- Frontière de responsabilité à documenter clairement.

Impacts futurs
- Les flux login, session et renouvellement de token devront rester cohérents entre les deux couches.
