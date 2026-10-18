"""Textes types des contrats, installés à la migration puis modifiables dans le back-office.

Projets de rédaction : à faire relire par un juriste avant la première signature.
Variables disponibles : voir services.VARIABLES.
"""

PREAMBULE = """Entre les soussignés :

{{ societe.raison_sociale }}, {{ societe.forme_juridique }}, dont le siège est situé {{ societe.adresse }}, {{ societe.pays }}, immatriculée au RCCM sous le numéro {{ societe.rccm }}, NIF {{ societe.nif }}, exploitant la plateforme Kwa-Ba ({{ societe.site }}), représentée par {{ societe.representant }}, ci-après « Kwa-Ba »,

et

{{ partie.nom }}, {{ partie.coordonnees }}, {{ partie.details }} ci-après « {{ partie.designation }} »."""

COMMUN_FIN = """## Données personnelles
Chaque partie traite les données personnelles reçues de l'autre (et celles des voyageurs) uniquement pour l'exécution du présent contrat, les garde confidentielles et ne les communique à aucun tiers non autorisé. Les données des voyageurs ne peuvent être utilisées à des fins commerciales en dehors de la plateforme.

## Durée et résiliation
Le présent contrat prend effet à la date de sa signature, pour une durée indéterminée. Chaque partie peut y mettre fin à tout moment par écrit (email ou messagerie Kwa-Ba), moyennant un préavis de trente (30) jours ; les engagements en cours à la date de fin restent exécutés. En cas de manquement grave (fraude, mise en danger d'un voyageur, informations mensongères), Kwa-Ba peut suspendre ou résilier le contrat sans préavis.

## Signature électronique et preuve
Les parties conviennent de signer le présent contrat par voie électronique. La signature est apposée au moyen d'un lien personnel adressé par email ou depuis le compte Kwa-Ba du signataire ; l'horodatage, l'adresse IP, le navigateur utilisé et l'empreinte numérique (SHA-256) du document sont conservés et figurent sur le certificat de signature annexé. Les parties reconnaissent à ce document signé électroniquement la même valeur probante qu'un écrit signé à la main.

## Droit applicable et litiges
Le présent contrat est régi par le droit de l'État du siège de Kwa-Ba et par les Actes uniformes de l'OHADA. Les parties recherchent d'abord une solution amiable ; à défaut, le litige est porté devant les juridictions compétentes du ressort du siège de Kwa-Ba."""


HOTE = PREAMBULE + """

## Objet
Le présent contrat fixe les conditions dans lesquelles l'Hôte propose un ou plusieurs logements à la location de courte durée sur la plateforme Kwa-Ba, et dans lesquelles Kwa-Ba assure leur mise en ligne, l'encaissement des réservations et le reversement des sommes dues à l'Hôte.

## Vérification et publication
Avant toute publication, l'Hôte fournit une pièce d'identité en cours de validité. Chaque logement est visité par un agent de terrain Kwa-Ba, qui contrôle sa conformité avec l'annonce (adresse, photos, équipements). Un logement n'est visible des voyageurs qu'après cette vérification. L'Hôte s'engage à tenir son annonce exacte et à jour (description, équipements, prix, disponibilités).

## Engagements de l'Hôte
L'Hôte déclare être propriétaire du logement ou autorisé à le louer. Il accueille les voyageurs dans un logement propre, sûr et conforme à l'annonce, aux dates réservées, respecte les horaires d'arrivée et de départ annoncés et répond aux messages des voyageurs dans un délai raisonnable. Il respecte la réglementation applicable (déclaration des voyageurs, fiscalité de ses revenus, assurance du logement).

## Prix, frais et commission
L'Hôte fixe librement le prix par nuit. Le voyageur règle en ligne le prix du séjour majoré de frais de service de {{ tarifs.frais_voyageur }}. Kwa-Ba retient sur le prix des nuits une commission de {{ tarifs.commission_hote }}, qui rémunère la mise en ligne, la vérification, l'encaissement sécurisé et l'assistance.

## Encaissement et reversement
Kwa-Ba encaisse l'intégralité du paiement du voyageur et le conserve jusqu'à l'arrivée de celui-ci. Le montant dû à l'Hôte (prix des nuits moins la commission) lui est reversé par Mobile Money vingt-quatre (24) heures après l'arrivée du voyageur, sur le numéro indiqué dans son espace hôte. L'Hôte ne demande aucun paiement complémentaire au voyageur en dehors de la plateforme.

## Annulations
Les conditions d'annulation affichées au voyageur s'appliquent : remboursement intégral plus de 7 jours avant l'arrivée ; 50 % des nuits retenues entre 7 jours et 48 heures ; aucun remboursement à moins de 48 heures. En cas d'annulation par l'Hôte, le voyageur est remboursé intégralement et Kwa-Ba peut suspendre l'annonce.

""" + COMMUN_FIN


LOUEUR = PREAMBULE + """

## Objet
Le présent contrat fixe les conditions dans lesquelles le Loueur met des véhicules, avec ou sans chauffeur, à la disposition des voyageurs ayant réservé une location sur la plateforme Kwa-Ba.

## Réservations et attribution
Le voyageur réserve et paie en ligne au moins {{ tarifs.delai_location }} jours avant la prise du véhicule, selon une grille de prix fixe par catégorie et par jour. Kwa-Ba attribue la location au Loueur, qui l'accepte ou la refuse sans délai. Une fois acceptée, le Loueur s'engage à remettre le véhicule à la date, à l'heure et au lieu convenus.

## Engagements du Loueur
Le Loueur remet un véhicule de la catégorie réservée, propre, en bon état de marche, assuré, avec des documents à jour (carte grise, assurance, visite technique). Lorsque la location est avec chauffeur, le chauffeur est titulaire d'un permis valide, courtois et ponctuel. Le Loueur peut demander une caution, dont le montant est affiché au voyageur avant le paiement ; elle est réglée à Kwa-Ba selon l'article « Caution ».

## Prix, commission et versement
Le voyageur règle en ligne le prix de la location à Kwa-Ba. Kwa-Ba retient une commission de {{ tarifs.commission_loueur }} et verse le solde au Loueur par Mobile Money vingt-quatre (24) heures après la fin de la location, ou à la fin du délai de signalement des dommages lorsque la location comporte une caution, sur le numéro communiqué à Kwa-Ba. Le Loueur ne demande aucun paiement au voyageur, ni caution ni complément : tout passe par Kwa-Ba.

## Caution
La caution est payée en ligne par le voyageur à Kwa-Ba, qui la conserve pendant la location. Le Loueur signale à Kwa-Ba tout dommage ou carburant manquant constaté au retour du véhicule, photos à l'appui, dans les {{ tarifs.restitution_caution }} heures suivant la fin de la location. Kwa-Ba fixe le montant retenu, dans la limite de la caution, et le verse au Loueur avec la location, sans commission ; le solde est remboursé au voyageur. Passé ce délai, la caution est remboursée intégralement au voyageur.

## Incidents
En cas de panne, d'accident ou de retard, le Loueur prévient immédiatement le voyageur et Kwa-Ba et propose une solution de remplacement. Une location non honorée par le Loueur est remboursée intégralement au voyageur et n'ouvre droit à aucun versement.

""" + COMMUN_FIN


CHAUFFEUR = PREAMBULE + """

## Objet
Le présent contrat fixe les conditions dans lesquelles le Chauffeur assure, en tant que partenaire indépendant, les transferts entre l'aéroport et le lieu de séjour des voyageurs ayant réservé sur la plateforme Kwa-Ba.

## Courses et attribution
Kwa-Ba attribue au Chauffeur les courses payées par les voyageurs et lui transmet le numéro de vol, l'heure d'arrivée, la destination, le nombre de passagers et de bagages. Le Chauffeur confirme chaque course et suit l'heure réelle d'arrivée du vol.

## Engagements du Chauffeur
Le Chauffeur attend le voyageur à la sortie avec une pancarte à son nom ; soixante (60) minutes d'attente sont incluses après l'atterrissage. Il conduit un véhicule de la catégorie annoncée, propre, en bon état, assuré et à jour de ses documents, est titulaire d'un permis valide et respecte le code de la route. Il n'accepte aucun paiement du voyageur pour une course réservée sur Kwa-Ba.

## Rémunération
Le prix de la course est payé en ligne par le voyageur à Kwa-Ba. Kwa-Ba retient une commission de {{ tarifs.commission_chauffeur }} et verse le solde au Chauffeur par Mobile Money vingt-quatre (24) heures après la prise en charge, sur le numéro communiqué à Kwa-Ba. Une course annulée par le voyageur moins de 24 heures avant l'arrivée reste due au Chauffeur.

## Indépendance
Le Chauffeur exerce son activité de manière indépendante : il reste libre d'accepter ou de refuser une course et assume ses obligations sociales et fiscales. Le présent contrat ne crée aucun lien de subordination entre les parties.

""" + COMMUN_FIN


ONG = PREAMBULE + """

## Objet
Le présent contrat fixe les conditions dans lesquelles Kwa-Ba présente l'Association sur Kwa-Ba Give, collecte les dons des utilisateurs en sa faveur et les lui reverse.

## Présentation de l'Association
L'Association fournit des informations exactes sur son identité, son enregistrement officiel, sa mission et ses projets, ainsi que des photos dont elle détient les droits. Kwa-Ba vérifie ces informations avant la publication et peut retirer la page de l'Association à tout moment en cas de doute.

## Collecte et reversement
Les dons sont payés en ligne à Kwa-Ba, qui les conserve pour le compte de l'Association. Kwa-Ba ne prélève aucune commission sur les dons ; les frais de paiement sont, au choix du donateur, ajoutés à son don ou déduits de celui-ci. Les dons d'un mois sont reversés à l'Association au plus tard le {{ give.jour_reversement }} du mois suivant, aux coordonnées qu'elle a communiquées ; la preuve du reversement est publiée sur sa page.

## Engagements de l'Association
L'Association affecte les dons reçus à sa mission et, lorsqu'un projet est désigné par le donateur, à ce projet. Elle informe Kwa-Ba de l'avancement de ses projets et de tout changement de ses coordonnées de reversement. Elle n'utilise pas les coordonnées des donateurs, qui ne lui sont pas transmises.

## Reçus
Kwa-Ba adresse au donateur un reçu de paiement. Kwa-Ba n'étant pas habilitée à délivrer des reçus fiscaux, l'Association reste seule responsable de tout reçu fiscal qu'elle est autorisée à émettre.

""" + COMMUN_FIN


MODELES = {
    'hote': ("Contrat de partenariat Hôte", HOTE),
    'loueur': ("Contrat de partenariat Loueur de véhicules", LOUEUR),
    'chauffeur': ("Contrat de partenariat Chauffeur (transferts aéroport)", CHAUFFEUR),
    'ong': ("Convention de partenariat Kwa-Ba Give", ONG),
}
