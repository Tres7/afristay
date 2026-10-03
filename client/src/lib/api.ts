import axios, { AxiosError } from "axios";
import { getSession, signOut } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/api-url";


const api = axios.create({
  baseURL:  getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const session = await getSession();
    if (session?.accessToken && !session.error) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    // Session expirée côté Django : on déconnecte proprement
    if (typeof window !== "undefined" && error.response?.status === 401 && error.config?.headers?.Authorization) {
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
