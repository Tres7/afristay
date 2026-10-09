import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getSession, signOut } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/api-url";


const api = axios.create({
  baseURL:  getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Token tenu à jour par SessionTokenSync (providers/AuthProvider.tsx) à chaque changement de session.
// undefined = session pas encore connue : on la demande alors une fois à NextAuth.
let accessToken: string | null | undefined;

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

/** Jeton d'accès courant, pour les requêtes faites hors d'axios (flux SSE du Concierge). */
export async function jetonAcces(): Promise<string | null> {
  if (accessToken !== undefined) return accessToken;
  return (await getSession())?.accessToken ?? null;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    // Évite un appel à /api/auth/session par requête (le polling de la messagerie en ferait un toutes les 4 s)
    const token = accessToken !== undefined ? accessToken : (await getSession())?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Plusieurs requêtes peuvent échouer en même temps : un seul renouvellement partagé
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    // getSession() rappelle NextAuth, dont le callback jwt renouvelle le token Django expiré
    refreshing = getSession()
      .then((session) => {
        const token = session && !session.error ? session.accessToken || null : null;
        setApiAccessToken(token);
        return token;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (typeof window !== "undefined" && error.response?.status === 401 && config?.headers?.Authorization) {
      // Token en cache expiré : on le renouvelle puis on rejoue la requête une seule fois
      if (!config._retried) {
        config._retried = true;
        const token = await refreshAccessToken();
        if (token && `Bearer ${token}` !== config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        }
      }
      // Refresh token Django expiré lui aussi : déconnexion propre
      setApiAccessToken(null);
      const callbackUrl = `/login?expired=1&callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      await signOut({ callbackUrl });
    }
    return Promise.reject(error);
  }
);

/** Extrait un message lisible d'une erreur DRF ({detail}, {champ: [msg]}, ...). */
export function apiErrorMessage(err: unknown, fallback = "Une erreur est survenue. Veuillez réessayer."): string {
  const e = err as AxiosError<Record<string, unknown>>;
  if (!e?.response) return "Impossible de contacter le serveur.";
  return firstErrorMessage(e.response.data) ?? fallback;
}

export function firstErrorMessage(data: unknown): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return data.length < 300 ? data : undefined;
  if (Array.isArray(data)) return firstErrorMessage(data[0]);
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    for (const value of Object.values(obj)) {
      const msg = firstErrorMessage(value);
      if (msg) return msg;
    }
  }
  return undefined;
}

export default api;
