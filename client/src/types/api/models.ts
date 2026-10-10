export type HebergementType = "hotel" | "villa" | "appartement" | "auberge";

export interface Hebergement {
  id: string;
  name: string;
  description: string;
  type: HebergementType;
  city: string;
  location: string;
  price_per_night: number;
  rating: number;
  review_count: number;
  image_url: string;
  images: string[];
  max_guests: number;
  amenities: string[];
  is_available: boolean;
  host_id: string;
  host_name: string;
  is_favorite: boolean;
  /** Visite de contrôle validée par Kwa-Ba (absent tant que le backend ne l'expose pas). */
  est_verifie?: boolean;
  created_at: string;
}

export interface City {
  city: string;
  count: number;
  min_price: number;
  image_url: string;
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Reservation {
  id: string;
  hebergement: string;
  hebergement_detail: Hebergement;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: ReservationStatus;
  payment_method: "mobile_money" | "carte" | "paypal";
  message: string;
  nights: number;
  reference: string;
  guest_name: string;
  avis_id: string | null;
  peut_evaluer: boolean;
  created_at: string;
  montants: {
    prix_nuits: number;
    frais_service: number;
    total: number;
    commission_hote: number;
    montant_hote: number;
  };
  /** Dernier paiement en ligne : null si la réservation a été faite sans paiement en ligne. */
  paiement: "en_attente" | "reussi" | "echoue" | "annule" | null;
  /** attente_numero : le voyageur doit indiquer son compte Mobile Money pour être remboursé. */
  remboursement: { montant: number; statut: "attente_numero" | "en_cours" | "envoye" } | null;
  /** Fin du délai pour payer (réservation en attente de paiement). */
  expire_le: string | null;
  annule_par: "" | "voyageur" | "hote" | "plateforme" | "expiration";
}

export interface Favori {
  id: string;
  hebergement: string;
  hebergement_detail: Hebergement;
  created_at: string;
}

export interface Paginated<T> {
  results: T[];
  count: number;
}

export interface Me {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "voyageur" | "hote" | "admin";
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  date_joined: string;
}

export type CritereAvis = "proprete" | "conformite" | "communication" | "emplacement" | "qualite_prix";

export interface Avis {
  id: string;
  note: number;
  criteres: Record<CritereAvis, number>;
  commentaire: string;
  auteur: { prenom: string; initiale: string; avatar_url: string | null };
  sejour: string;
  reponse_hote: string;
  reponse_le: string | null;
  created_at: string;
}

export interface AvisResume {
  moyenne: number | null;
  total: number;
  criteres: Record<CritereAvis, number | null>;
  libelles: Record<CritereAvis, string>;
  repartition: Record<string, number>;
}

export interface AvisPage {
  resume: AvisResume;
  results: Avis[];
  count: number;
}

export interface SejourAEvaluer {
  reservation_id: string;
  check_in: string;
  check_out: string;
  hebergement: Hebergement;
}
