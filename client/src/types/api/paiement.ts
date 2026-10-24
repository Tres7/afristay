export interface OperateurPaiement {
  code: string;
  nom: string;
}

export interface PaysPaiement {
  code: "TG" | "BJ" | "BF" | "NE" | "ML";
  nom: string;
  indicatif: string;
  chiffres: number;
  operateurs: OperateurPaiement[];
}

export type MoyenPaiement = "mobile_money" | "carte" | "paypal";

export interface ConfigPaiement {
  actif: boolean;
  /** Moyens proposés : mobile_money et carte passent par FedaPay, paypal est débité en euros. */
  moyens: MoyenPaiement[];
  fcfa_par_euro: number;
  environnement: "sandbox" | "live";
  frais_voyageur: number;
  /** Frais réduits : Client fidèle, Pack Séjour + Chauffeur. */
  frais_reduits: number;
  commission_hote: number;
  /** Commission selon le type de partenaire (grille tarifaire). */
  commissions: { particulier: number; hotel: number; fondateur: number };
  delai_paiement_minutes: number;
  pays: PaysPaiement[];
}

export type StatutPaiement = "en_attente" | "reussi" | "echoue" | "annule";

export interface StatutPaiementReservation {
  reservation: "pending" | "confirmed" | "cancelled";
  paiement: StatutPaiement | null;
  expire_le: string | null;
  annule_par: string;
}

export interface ProfilVersement {
  pays: PaysPaiement["code"];
  operateur: string;
  numero: string;
  titulaire: string;
  mis_a_jour_le?: string;
}

export type StatutVersement = "planifie" | "en_cours" | "envoye" | "echoue";

export interface Versement {
  id: string;
  reservation_id: string;
  reference: string;
  hebergement: string;
  voyageur: string;
  check_in: string;
  check_out: string;
  montant_brut: number;
  commission: number;
  montant: number;
  statut: StatutVersement;
  date_prevue: string;
  envoye_le: string | null;
  probleme: string;
}

export interface Revenus {
  totaux: { a_venir: number; en_cours: number; verse: number; commission: number };
  profil_complet: boolean;
  /** Commission de cet hôte aujourd'hui, en % (8, 12 pour un hôtel, 5 pendant le Programme Fondateurs). */
  commission_pourcent: number;
  /** Type de partenaire réglé par l'équipe : particulier (8 %), hôtel (12 %), fondateur (5 % pendant 6 mois). */
  partenaire: "particulier" | "hotel" | "fondateur";
  frais_voyageur_pourcent: number;
  versements: Versement[];
}
