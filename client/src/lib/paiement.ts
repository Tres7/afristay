import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ConfigPaiement, MoyenPaiement } from "@/types/api/paiement";

/** Paramètres publics du paiement en ligne (actif ou non, taux, pays et opérateurs). */
export function useConfigPaiement() {
  return useQuery({
    queryKey: ["paiements", "config"],
    queryFn: async () => (await api.get<ConfigPaiement>("/v1/paiements/config/")).data,
    // Court : un moyen de paiement activé côté serveur doit apparaître sans recharger la page
    staleTime: 60 * 1000,
  });
}

/** Crée la transaction FedaPay et envoie le navigateur sur la page de paiement sécurisée. */
export async function allerPayer(reservationId: string, moyen?: MoyenPaiement) {
  const res = await api.post<{ url: string }>(`/v1/paiements/reservations/${reservationId}/payer/`, moyen ? { moyen } : {});
  window.location.assign(res.data.url);
}

/** Temps restant avant la libération des dates, en minutes (arrondi au supérieur). */
export function minutesRestantes(expireLe: string | null): number | null {
  if (!expireLe) return null;
  return Math.max(0, Math.ceil((new Date(expireLe).getTime() - Date.now()) / 60000));
}

/** Montant en euros débité par PayPal (parité fixe FCFA/euro). */
export function enEuros(montantFcfa: number, fcfaParEuro: number): string {
  return (Math.round((montantFcfa / fcfaParEuro) * 100) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
