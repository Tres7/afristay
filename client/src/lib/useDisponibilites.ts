import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { addDays, isoDate } from "@/lib/utils";

export interface PeriodeIndispo {
  debut: string;
  fin: string;
  // Détail réservé à l'hôte du logement
  type?: "reservation" | "blocage";
  id?: string;
  motif?: string;
  voyageur?: string;
  reference?: string;
}

/** Nuits indisponibles (AAAA-MM-JJ) d'une liste de périodes [debut, fin). */
export function nuitsIndisponibles(periodes: PeriodeIndispo[]): Set<string> {
  const nuits = new Set<string>();
  for (const p of periodes) {
    for (let d = p.debut; d < p.fin; d = addDays(d, 1)) nuits.add(d);
  }
  return nuits;
}

/** Calendrier d'un logement sur `jours` jours à partir d'aujourd'hui. */
export function useDisponibilites(hebergementId: string | undefined, jours = 365) {
  const debut = isoDate();
  const fin = addDays(debut, jours);
  return useQuery({
    queryKey: ["disponibilites", hebergementId, debut, jours],
    queryFn: async () =>
      (await api.get<{ periodes: PeriodeIndispo[] }>(`/v1/hebergements/${hebergementId}/disponibilites/`, { params: { debut, fin } })).data.periodes,
    enabled: !!hebergementId,
    staleTime: 30_000,
  });
}
