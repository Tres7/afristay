# Location de voitures

Le voyageur loue une voiture, **avec chauffeur ou en la conduisant lui-même**, auprès d'un **loueur partenaire**. Kwa-Ba encaisse en ligne, attribue la location à un loueur et lui verse sa part, moins la commission. Le fonctionnement reprend celui des transferts aéroport.
Code : `server/apps/locations/` (backend), `client/src/app/[locale]/(main)/location/` (frontend).

## Tout est administré

Rien n'est proposé au voyageur tant que l'administration n'a pas tout paramétré (`/admin/locations/`). La page affiche alors « bientôt disponible ».

| Écran de l'admin | Contenu |
|---|---|
| **Paramètres de la location** (une seule ligne) | Commission Kwa-Ba (%), délai minimum de réservation (2 jours par défaut), durée maximale, délai d'annulation gratuite (heures), conditions affichées au voyageur (âge, permis, carburant…) |
| **Catégories de véhicules** | Gamme (citadine, berline, SUV, 4x4, minibus, utilitaire : les filtres du site), modèle d'exemple, places, valises, boîte, carburant, climatisation, photo, **prix par jour sans chauffeur et avec chauffeur**, caution. Un prix vide retire la formule ; une catégorie n'est proposée que si elle est **active** et a au moins un prix. Les prix se modifient directement dans la liste. |
| **Lieux de remise** | Aéroport, agence, ou livraison (le voyageur saisit alors une adresse), ville, fuseau horaire, frais ajoutés à la remise et au retour |
| **Loueurs partenaires** | Agence, contact, téléphone, email (facultatif), catégories et lieux couverts, compte Mobile Money pour les versements |

Les 7 catégories standard (citadine, citadine automatique, berline, SUV, 4x4, minibus, utilitaire) sont créées par la migration **sans prix et inactives**.

## Cycle

| Étape | Statut | Qui |
|---|---|---|
| Demande : véhicule, formule, lieux et dates, personnes, téléphone, **précisions obligatoires**, permis si le voyageur conduit | `en_attente_paiement` (délai de paiement des séjours) | Voyageur, au plus tard *délai minimum* jours avant la prise |
| Paiement reçu | `confirmee` : email au voyageur, alerte « loueur à attribuer » aux administrateurs (« URGENT » à moins de 48 h de la prise) | Worker |
| Loueur, véhicule remis (modèle, immatriculation) et chauffeur choisis dans l'admin | `partenaire_assigne` : le voyageur reçoit les coordonnées, le loueur le détail ; versement planifié au retour + 24 h | Admin |
| Versement du loueur | `terminee` | Worker |

- **Prix :** prix par jour × nombre de tranches de 24 h entamées, plus les frais des lieux de remise et de retour. Il est toujours calculé par le serveur et figé à la réservation.
- **Caution :** voiture sans chauffeur uniquement, réglée au loueur à la remise du véhicule. Elle n'est pas encaissée en ligne.
- **Annulation par le voyageur :** remboursement intégral jusqu'au délai d'annulation gratuite ; ensuite, rien n'est remboursé et le loueur reste payé.
- **Annulation par Kwa-Ba** (par exemple, aucun loueur disponible) : action « Annuler et rembourser intégralement » dans la liste des locations.
