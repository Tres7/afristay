import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SERVICE_FEE_RATE = 0.08;

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?q=80&w=1200&auto=format&fit=crop";

// Langue d'affichage des dates, prix et libellés : définie à chaque rendu par <SynchroLangue /> (racine du site)
let langueCourante: "fr" | "en" = "fr";
const LOCALES = { fr: "fr-FR", en: "en-GB" } as const;

export function definirLangue(langue: string) {
  langueCourante = langue === "en" ? "en" : "fr";
}

export function langue(): "fr" | "en" {
  return langueCourante;
}

/** Choisit le texte de la langue courante : selon({ fr: "…", en: "…" }). */
export function selon<T>(textes: { fr: T; en: T }): T {
  return textes[langueCourante];
}

const TYPES: Record<string, { fr: string; en: string }> = {
  hotel: { fr: "Hôtel", en: "Hotel" },
  villa: { fr: "Villa", en: "Villa" },
  appartement: { fr: "Appartement", en: "Apartment" },
  auberge: { fr: "Auberge", en: "Guesthouse" },
};

/** Libellés des types de logement, dans la langue courante (TYPE_LABELS[type]). */
export const TYPE_LABELS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_, type: string) => (TYPES[type] ? TYPES[type][langueCourante] : type),
});

const ROLES: Record<string, { fr: string; en: string }> = {
  voyageur: { fr: "Voyageur", en: "Traveller" },
  hote: { fr: "Hôte", en: "Host" },
  admin: { fr: "Administrateur", en: "Administrator" },
};

/** Libellés des rôles, dans la langue courante (ROLE_LABELS[role]). */
export const ROLE_LABELS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_, role: string) => (ROLES[role] ? ROLES[role][langueCourante] : role),
});

export function formatPrice(price: number | string): string {
  // fr-FR sépare les milliers par une espace fine (U+202F) quasi invisible dans certaines polices :
  // on la remplace par une espace insécable classique (U+00A0)
  const montant = Math.round(Number(price)).toLocaleString(LOCALES[langueCourante]).replace(/\u202f/g, "\u00a0");
  return `${montant}\u00a0FCFA`;
}

export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function calculateServiceFee(subtotal: number, rate = SERVICE_FEE_RATE): number {
  return Math.round(subtotal * rate);
}

export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(LOCALES[langueCourante], opts);
}

/** Date locale au format AAAA-MM-JJ (évite le décalage UTC de toISOString). */
export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function initials(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
