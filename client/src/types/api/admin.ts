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

export type Role = "voyageur" | "hote" | "agent" | "admin";

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
  /** Vérifiée par un agent (ou validée par un admin) : seule une annonce vérifiée et visible est publiée. */
  est_verifie: boolean;
  statut_verification: "en_attente" | "verifiee" | "refusee";
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

// --- Location de voiture (back-office) ---------------------------------------------------------

export interface ReglesLocation {
  commission_pourcent: string;
  delai_min_jours: number;
  duree_max_jours: number;
  annulation_gratuite_heures: number;
  conditions: string;
}

export interface CategorieVehicule {
  id: number;
  nom: string;
  gamme: "citadine" | "berline" | "suv" | "4x4" | "minibus" | "utilitaire";
  exemple_modele: string;
  description: string;
  places: number;
  bagages: number;
  boite: "manuelle" | "automatique";
  carburant: "essence" | "diesel" | "hybride" | "electrique";
  climatisation: boolean;
  image: string | null;
  prix_jour_sans_chauffeur: number | null;
  prix_jour_avec_chauffeur: number | null;
  caution: number;
  actif: boolean;
  ordre: number;
}

export interface LieuRemise {
  id: number;
  nom: string;
  ville: string;
  fuseau: "Africa/Lome" | "Africa/Porto-Novo";
  adresse_requise: boolean;
  frais: number;
  actif: boolean;
  ordre: number;
}

export interface Loueur {
  id: number;
  nom: string;
  contact: string;
  telephone: string;
  email: string;
  categories: number[];
  lieux: number[];
  actif: boolean;
  pays_versement: string;
  operateur_versement: string;
  numero_versement: string;
  nb_locations: number;
}

export interface AdminLocation {
  id: string;
  reference: string;
  statut: "en_attente_paiement" | "confirmee" | "partenaire_assigne" | "terminee" | "annulee";
  statut_libelle: string;
  voyageur: { nom: string; email: string };
  telephone: string;
  categorie: string;
  formule: "sans_chauffeur" | "avec_chauffeur";
  formule_libelle: string;
  lieu_prise: string;
  adresse_prise: string;
  lieu_retour: string;
  adresse_retour: string;
  debut: string;
  fin: string;
  jours: number;
  passagers: number;
  prix: number;
  caution: number;
  precisions: string;
  conducteur: string;
  permis_numero: string;
  permis_pays: string;
  partenaire: { id: number; nom: string } | null;
  vehicule: string;
  immatriculation: string;
  chauffeur_nom: string;
  chauffeur_telephone: string;
  cree_le: string;
}
