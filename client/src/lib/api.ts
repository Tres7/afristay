import axios from "axios";
import { getSession } from "next-auth/react";
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

export default api;
