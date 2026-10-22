# Location de voitures et chauffeurs

Offre mobilité du 18 octobre 2026 (CGV art. 6.5 et 14, contrats propriétaire B4 et chauffeur B5). Trois formules :

| Formule | Ce que paie le client | Caution |
|---|---|---|
| **Avec chauffeur** (`avec_chauffeur`) | prix du véhicule (fixé par le propriétaire) + 7 000 FCFA par jour de chauffeur + primes | aucune |
| **Je conduis** (`sans_chauffeur`) | prix du véhicule | 0, 1 ou 2 journées, 100 000 FCFA au plus |
| **Chauffeur pour ma voiture** (`chauffeur_seul`) | 7 000 FCFA par jour + primes ; ni véhicule, ni frais de remise | aucune |

Aucun frais de service pour le client sur la voiture. Primes de déplacement : 1 500 FCFA par jour hors de Lomé, 2 000 hors du pays, reversées en totalité au chauffeur. Le propriétaire et le chauffeur ne sont **jamais montrés sur le site** : leurs coordonnées partent par email au voyageur après le paiement et l'attribution (voir anti-fraude).

Code : `server/apps/locations/` (backend), `client/src/app/[locale]/(main)/location/` (frontend), back-office **Location** (`client/src/components/backoffice/location/`).

## Ce que l'équipe paramètre (back-office → Location)

| Onglet | Contenu |
|---|---|
| **Règles** (une seule ligne) | Commission sur le véhicule (15 %), délai minimum de réservation (2 jours), durée maximale, annulation gratuite (48 h), conditions affichées (âge, permis…), caution en ligne, délai de signalement des dommages |
| **Véhicules** (`CategorieVehiculeModel`, nom historique) | Propriétaire, nom, marque et modèle, année, immatriculation, places, valises, boîte, carburant, photos, **prix par jour du propriétaire**, formules proposées, **caution en journées** (calculée et plafonnée), fin de validité de l'assurance et de la visite technique. Un véhicule n'est proposé qu'actif, avec un prix, un propriétaire actif et des papiers à jour |
| **Lieux de remise** | Aéroport, agence ou livraison (adresse saisie par le voyageur), frais de remise et de retour |
| **Propriétaires** (`PartenaireLocationModel`) | Contact, lieux, compte Mobile Money, **Programme Fondateurs** (dates : 10 % pendant 6 mois). Statut Propriétaire Fidèle automatique : 12 % après 20 locations terminées sans retenue |
| Transferts → **Chauffeurs** | Chauffeurs partenaires (transferts et missions à la journée), statut **Excellence** |

Les catégories types de la migration initiale restent inactives et sans prix : il faut leur donner un propriétaire et un prix.

## Cycle

| Étape | Statut | Qui |
|---|---|---|
| Demande : véhicule (sauf chauffeur seul), formule, lieux et dates, personnes, téléphone, **précisions**, permis si le voyageur conduit, jours hors de Lomé / hors du pays, « Mon chauffeur », séjour Kwa-Ba associé ; acceptation des CGV | `en_attente_paiement` | Voyageur, au moins *délai minimum* jours avant |
| Paiement reçu | `confirmee` : email au voyageur, alerte « location à attribuer » (« URGENT » à moins de 48 h) ; **Pack Séjour** appliqué si un séjour est associé | Worker |
| Propriétaire (et véhicule remis) et/ou chauffeur partenaire choisis | `partenaire_assigne` : coordonnées au voyageur, détail au propriétaire et au chauffeur (sans le téléphone du voyageur) ; versements planifiés | Back-office → Suivi |
| Versements envoyés | `terminee` | Worker |

## Argent

- **Propriétaire** (`VersementPartenaireModel`) : prix du véhicule + frais de remise − commission (15 / 12 / 10 %), plus la retenue éventuelle sur la caution. Versé 24 h après le début de la location, ou après le délai de signalement des dommages quand une caution est gardée.
- **Chauffeur** (`VersementChauffeurLocationModel`) : 6 000 FCFA par jour (6 500 s'il est Excellence ou redemandé par le voyageur : « Mon chauffeur »), plus les primes. Kwa-Ba garde 1 000 FCFA par jour (500). Versé 24 h après la fin de la mission.
- **Caution** (voiture seule) : payée en ligne avec la location, gardée par Kwa-Ba, **divisée par deux** pour un client qui a 3 locations terminées sans retenue, remboursée moins la retenue après le délai de signalement.
- **Pack Séjour + Chauffeur** : une formule avec chauffeur payée avec un séjour Kwa-Ba à venir ramène les frais de service du séjour à 3 % ; la différence est remboursée (`services.appliquer_pack_sejour`).
- **Annulation par le voyageur** (`services.retenue_si_annulation`) : intégral jusqu'à 48 h avant (et dans les 48 h suivant la réservation si la prise est dans 7 jours ou plus), 50 % jusqu'à 24 h avant, rien ensuite. La part retenue est versée au propriétaire et au chauffeur au prorata ; la caution est toujours rendue.
- **Annulation par Kwa-Ba** : remboursement intégral (Suivi → Annuler).

## Migration

`locations/0007` reprend les anciens prix (prix sans chauffeur, sinon prix avec chauffeur − 7 000) et convertit la caution en journées. Les colonnes `prix_jour_sans_chauffeur` et `prix_jour_avec_chauffeur` sont seulement retirées du modèle : à supprimer dans une version ultérieure (règle « ajouter avant de supprimer »).
