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
  commission_hote: number;
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
  versements: Versement[];
}
