export type Formule = "sans_chauffeur" | "avec_chauffeur" | "chauffeur_seul";
export type StatutLocation = "en_attente_paiement" | "confirmee" | "partenaire_assigne" | "terminee" | "annulee";

/** Véhicule d'un propriétaire partenaire (jamais nommé sur le site). */
export interface CategorieVehicule {
  id: number;
  nom: string;
  gamme: string;
  gamme_libelle: string;
  exemple_modele: string;
  description: string;
  places: number;
  bagages: number;
  boite: "manuelle" | "automatique";
  carburant: string;
  climatisation: boolean;
  annee: number | null;
  /** Photo principale (première de `photos`). */
  image: string | null;
  photos: string[];
  /** Prix du véhicule par jour, fixé par le propriétaire ; le chauffeur est facturé en plus. */
  prix_jour: number;
  formules: { sans_chauffeur: boolean; avec_chauffeur: boolean };
  /** Caution (voiture seule) : 0, une ou deux journées, 100 000 FCFA au plus. */
  caution: number;
  caution_jours: 0 | 1 | 2;
}

export interface LieuRemise {
  id: number;
  nom: string;
  ville: string;
  adresse_requise: boolean;
  frais: number;
  fuseau: string;
}

export interface TarifsChauffeur {
  prix_jour: number;
  prime_hors_lome: number;
  prime_hors_pays: number;
  heure_sup: number;
}

export interface CatalogueLocation {
  active: boolean;
  regles?: {
    delai_min_jours: number; duree_max_jours: number; annulation_gratuite_heures: number; conditions: string;
    caution_en_ligne: boolean; restitution_caution_heures: number;
  };
  categories?: CategorieVehicule[];
  chauffeur?: TarifsChauffeur;
  lieux?: LieuRemise[];
  filtres?: { gammes: { code: string; nom: string }[]; boites: { code: string; nom: string }[]; carburants: { code: string; nom: string }[] };
}

export interface DevisLocation {
  jours: number;
  prix_jour: number;
  prix_vehicule: number;
  frais_lieux: number;
  /** 7 000 FCFA par jour pour les formules avec chauffeur. */
  prix_chauffeur: number;
  /** Primes de déplacement du chauffeur (hors de Lomé, hors du pays). */
  primes: number;
  prix: number;
  caution: number;
  /** Caution payée avec la location et gardée par Kwa-Ba (sinon réglée au propriétaire à la remise). */
  caution_en_ligne: boolean;
  /** Montant payé en ligne : la location et, le cas échéant, la caution. */
  a_payer: number;
}

export interface Location {
  id: string;
  reference: string;
  libelle: string;
  categorie: number | null;
  /** null pour un chauffeur seul (véhicule du client). */
  categorie_detail: CategorieVehicule | null;
  formule: Formule;
  lieu_prise_detail: LieuRemise;
  adresse_prise: string;
  lieu_retour_detail: LieuRemise;
  adresse_retour: string;
  debut_locale: string;
  fin_locale: string;
  passagers: number;
  telephone: string;
  precisions: string;
  conducteur: string;
  jours: number;
  prix_jour: number;
  frais_lieux: number;
  prix_chauffeur: number;
  primes: number;
  jours_hors_lome: number;
  jours_hors_pays: number;
  chauffeur_demande: number | null;
  prix: number;
  caution: number;
  caution_en_ligne: boolean;
  a_payer: number;
  /** Caution gardée par Kwa-Ba : remboursée `restitution_heures` après le retour, moins la retenue. */
  caution_etat: { restituee: boolean; retenue: number; motif: string; restitution_heures: number } | null;
  statut: StatutLocation;
  expire_le: string | null;
  annulee_par: string;
  /** Véhicule attribué ; le propriétaire et le chauffeur ne sont jamais affichés (coordonnées envoyées par email). */
  vehicule_attribue: { vehicule: string; immatriculation: string } | null;
  paiement: "en_attente" | "reussi" | "echoue" | "annule" | null;
  remboursement: { montant: number; statut: "attente_numero" | "en_cours" | "envoye" } | null;
  annulation_gratuite: boolean;
  /** Montant rendu si le voyageur annule maintenant (null si l'annulation n'est plus possible). */
  rembourse_si_annulation: number | null;
  cree_le: string;
}

/** « Mon chauffeur » : chauffeur qui a déjà conduit le voyageur. */
export interface MonChauffeur {
  id: number;
  nom: string;
}
