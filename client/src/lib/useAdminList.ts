import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AdminPage } from "@/types/api/admin";

export const PAGE_SIZE = 20;

/** Liste paginée et filtrée du back-office. Les filtres vides ne sont pas envoyés. */
export function useAdminList<T>(ressource: string, filtres: Record<string, string>) {
  const [page, setPage] = useState(1);
  const cle = JSON.stringify(filtres);

  // Nouveau filtre : retour à la première page
  useEffect(() => setPage(1), [cle]);

  const query = useQuery({
    queryKey: ["admin", ressource, cle, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      for (const [k, v] of Object.entries(filtres)) if (v) params[k] = v;
      return (await api.get<AdminPage<T>>(`/v1/admin/${ressource}/`, { params })).data;
    },
    placeholderData: keepPreviousData,
  });

  return { ...query, page, setPage };
}

/** Valeur retardée (recherche au fil de la frappe sans une requête par touche). */
export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
