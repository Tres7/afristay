// Contrat : documentation/modules/backoffice-api.md

export interface AdminPage<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
}

export interface AdminStats {
  utilisateurs: { total: number; nouveaux_30j: number; hotes: number; desactives: number };
  annonces: { total: number; visibles: number; verifiees: number };
  reservations: { confirmees_30j: number; annulees_30j: number; volume_30j: number };
  avis: { total: number; moyenne: number | null };
  reservations_par_jour: { date: string; nombre: number; volume: number }[];
}

export type Role = "voyageur" | "hote" | "admin";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  nb_reservations: number;
  nb_annonces: number;
}

export interface AdminHebergement {
  id: string;
  name: string;
  type: string;
  city: string;
  location: string;
  price_per_night: number;
  image_url: string;
  is_available: boolean;
  est_verifie: boolean;
  rating: number;
  review_count: number;
  nb_reservations: number;
  host: { id: string; nom: string; email: string };
  created_at: string;
}

export interface AdminReservation {
  id: string;
  reference: string;
  hebergement: { id: string; name: string; city: string };
  voyageur: { id: string; nom: string; email: string };
  hote: { id: string; nom: string };
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled";
  payment_method: "mobile_money" | "carte" | "paypal";
  created_at: string;
}

export interface AdminAvis {
  id: string;
  note: number;
  commentaire: string;
  auteur: { id: string; nom: string; email: string };
  hebergement: { id: string; name: string };
  reponse_hote: string;
  created_at: string;
}
