import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getSession, signOut } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/api-url";
import { langue, selon } from "@/lib/utils";


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
  // Langue de l'utilisateur : réponses du Concierge et, à terme, messages de l'API
  config.headers["Accept-Language"] = langue();
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
let refreshing: Promise<{ token: string | null; expiree: boolean }> | null = null;

/** `expiree` : l'API a refusé le refresh token (session réellement terminée). Une session illisible
 * (réseau coupé au réveil de l'ordinateur, par ex.) n'est pas une expiration : on ne déconnecte pas. */
async function refreshAccessToken(): Promise<{ token: string | null; expiree: boolean }> {
  if (!refreshing) {
    // getSession() rappelle NextAuth, dont le callback jwt renouvelle le token Django expiré
    refreshing = getSession()
      .then((session) => {
        const expiree = session?.error === "RefreshAccessTokenError";
        const token = session && !expiree ? session.accessToken || null : null;
        if (session) setApiAccessToken(token);
        return { token, expiree };
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
      if (config._retried) return Promise.reject(error);
      config._retried = true;
      const { token, expiree } = await refreshAccessToken();
      if (token && `Bearer ${token}` !== config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
      // Renouvellement impossible pour l'instant (API ou réseau indisponible) : la session est gardée
      if (!expiree) return Promise.reject(error);
      // Refresh token Django refusé : déconnexion propre
      setApiAccessToken(null);
      // La page de connexion reste dans la langue courante ; le retour se fait sans le préfixe /en (ajouté par le routeur)
      const prefixe = langue() === "en" ? "/en" : "";
      const chemin = window.location.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
      const callbackUrl = `${prefixe}/login?expired=1&callbackUrl=${encodeURIComponent(chemin)}`;
      await signOut({ callbackUrl });
    }
    return Promise.reject(error);
  }
);

/** Extrait un message lisible d'une erreur DRF ({detail}, {champ: [msg]}, ...). */
export function apiErrorMessage(err: unknown, fallback?: string): string {
  const e = err as AxiosError<Record<string, unknown>>;
  if (!e?.response) return selon({ fr: "Impossible de contacter le serveur.", en: "Unable to reach the server." });
  // Pre-launch mode (config/prelancement.py on the API): bookings and payments are not open yet
  if (e.response.data?.code === "prelancement") {
    return selon({
      fr: "Kwa-Ba ouvre bientôt : les réservations et les paiements ne sont pas encore ouverts.",
      en: "Kwa-Ba opens soon: bookings and payments are not open yet.",
    });
  }
  if (e.response.data?.code === "preinscription_requise") {
    return selon({
      fr: "Acceptez d'abord la pré-inscription pour créer votre annonce.",
      en: "Please accept the pre-registration first to create your listing.",
    });
  }
  return firstErrorMessage(e.response.data) ?? fallback ?? selon({ fr: "Une erreur est survenue. Veuillez réessayer.", en: "Something went wrong. Please try again." });
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
