export type Formule = "sans_chauffeur" | "avec_chauffeur";
export type StatutLocation = "en_attente_paiement" | "confirmee" | "partenaire_assigne" | "terminee" | "annulee";

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
  /** Photo principale (première de `photos`). */
  image: string | null;
  photos: string[];
  prix_jour: Record<Formule, number | null>;
  caution: number;
}

export interface LieuRemise {
  id: number;
  nom: string;
  ville: string;
  adresse_requise: boolean;
  frais: number;
  fuseau: string;
}

export interface CatalogueLocation {
  active: boolean;
  regles?: {
    delai_min_jours: number; duree_max_jours: number; annulation_gratuite_heures: number; conditions: string;
    caution_en_ligne: boolean; restitution_caution_heures: number;
  };
  categories?: CategorieVehicule[];
  lieux?: LieuRemise[];
  filtres?: { gammes: { code: string; nom: string }[]; boites: { code: string; nom: string }[]; carburants: { code: string; nom: string }[] };
}

export interface DevisLocation {
  jours: number;
  prix_jour: number;
  frais_lieux: number;
  prix: number;
  caution: number;
  /** Caution payée avec la location et gardée par Kwa-Ba (sinon réglée au loueur à la remise). */
  caution_en_ligne: boolean;
  /** Montant payé en ligne : la location et, le cas échéant, la caution. */
  a_payer: number;
}

export interface Location {
  id: string;
  reference: string;
  categorie: number;
  categorie_detail: CategorieVehicule;
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
  prix: number;
  caution: number;
  caution_en_ligne: boolean;
  a_payer: number;
  /** Caution gardée par Kwa-Ba : remboursée `restitution_heures` après le retour, moins la retenue. */
  caution_etat: { restituee: boolean; retenue: number; motif: string; restitution_heures: number } | null;
  statut: StatutLocation;
  expire_le: string | null;
  annulee_par: string;
  /** Véhicule attribué ; le loueur et son chauffeur ne sont jamais affichés (coordonnées envoyées par email). */
  vehicule_attribue: { vehicule: string; immatriculation: string } | null;
  paiement: "en_attente" | "reussi" | "echoue" | "annule" | null;
  remboursement: { montant: number; statut: "attente_numero" | "en_cours" | "envoye" } | null;
  annulation_gratuite: boolean;
  cree_le: string;
}
