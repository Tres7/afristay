import { getApiBaseUrl } from "@/lib/api-url";

export type BackendUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url: string | null;
};

/**
 * Profil lu par l'API avec ce jeton d'accès. Source de vérité de l'identité et du rôle dans la session : rien de ce
 * que le navigateur envoie (identifiant, rôle) n'y entre sans être confirmé par l'API. null si le jeton est refusé.
 */
export async function fetchBackendUser(accessToken: string): Promise<BackendUser | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/v1/users/me/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as BackendUser;
  } catch {
    return null;
  }
}
