import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/**
 * Pre-launch mode, read from the API (PRELANCEMENT in the server environment): switching it needs no new client
 * image. False while unknown or if the API cannot be reached, so the usual site is shown by default.
 */
export function usePrelancement(): boolean {
  const { data } = useQuery({
    queryKey: ["lancement", "prelancement"],
    queryFn: async () => (await api.get<{ prelancement: boolean }>("/v1/hebergements/lancement/")).data.prelancement,
    staleTime: 5 * 60_000,
  });
  return data === true;
}
