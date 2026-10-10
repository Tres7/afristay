import { useQuery } from "@tanstack/react-query";
import { BookOpen, Droplets, HeartPulse, Leaf } from "lucide-react";
import api from "@/lib/api";
import type { CodeCause, ConfigGive } from "@/types/api/give";

export const CAUSES: Record<CodeCause, { nom: string; icon: typeof BookOpen; couleur: string }> = {
  education: { nom: "Éducation", icon: BookOpen, couleur: "bg-amber-100 text-amber-800" },
  sante: { nom: "Santé", icon: HeartPulse, couleur: "bg-rose-100 text-rose-800" },
  eau: { nom: "Accès à l'eau", icon: Droplets, couleur: "bg-sky-100 text-sky-800" },
  environnement: { nom: "Environnement", icon: Leaf, couleur: "bg-emerald-100 text-emerald-800" },
};

export const PAYS: Record<string, string> = { TG: "Togo", BJ: "Bénin", BF: "Burkina Faso", NE: "Niger", ML: "Mali" };

/** Paramètres publics des dons : montants suggérés, frais, calendrier des reversements. */
export function useConfigGive() {
  return useQuery({
    queryKey: ["give", "config"],
    queryFn: async () => (await api.get<ConfigGive>("/v1/give/config/")).data,
    staleTime: 60 * 1000,
  });
}

/** Même calcul que le serveur (apps/give/montants.py) : affiché avant le paiement. */
export function calculerDon(montant: number, couvreFrais: boolean, taux: number) {
  if (couvreFrais) {
    const total = Math.ceil(montant / (1 - taux));
    return { frais: total - montant, total, montantOng: montant };
  }
  const frais = Math.round(montant * taux);
  return { frais, total: montant, montantOng: montant - frais };
}

/** Date limite du reversement à l'ONG d'un don fait aujourd'hui. */
export function dateReversement(jour: number, depuis = new Date()): Date {
  return new Date(depuis.getFullYear(), depuis.getMonth() + 1, jour);
}

export function moisAnnee(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
