# Titre:
Communication inter-modules par événements vs appels directs

# Status:
Accepté

# Contexte :
Tous les besoins de communication entre modules ne nécessitent pas le même niveau de découplage. L'équipe doit éviter d'utiliser les événements partout par réflexe.
.

# Options
Option 1 : Privilégier systématiquement les appels directs.
Option 2 : Privilégier systématiquement les événements.
Option 3 : Choisir entre événements et appels directs selon le besoin.

# Décision
Nous choisissons la forme de communication en fonction du besoin de couplage, de synchronicité et de responsabilité métier.

# Conséquences :
positives (bénéfices)
- Meilleur pragmatisme architectural.
- Évite à la fois le couplage excessif et le sur-usage de l'EDA.

négatifs (inconvénients)
- Demande une discipline d'équipe pour rester cohérent.
- Nécessite des critères explicites de choix.

Impacts futurs
- Cette décision devra être complétée par des conventions de cas d'usage.
