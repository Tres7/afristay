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
  created_at: string;
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
