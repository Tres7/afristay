import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SERVICE_FEE_RATE = 0.08;

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?q=80&w=1200&auto=format&fit=crop";

export const TYPE_LABELS: Record<string, string> = {
  hotel: "Hôtel",
  villa: "Villa",
  appartement: "Appartement",
  auberge: "Auberge",
};

export const ROLE_LABELS: Record<string, string> = {
  voyageur: "Voyageur",
  hote: "Hôte",
  admin: "Administrateur",
};

export function formatPrice(price: number | string): string {
  // fr-FR sépare les milliers par une espace fine (U+202F) quasi invisible dans certaines polices :
  // on la remplace par une espace insécable classique (U+00A0)
  const montant = Math.round(Number(price)).toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
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
  return new Date(d).toLocaleDateString("fr-FR", opts);
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
