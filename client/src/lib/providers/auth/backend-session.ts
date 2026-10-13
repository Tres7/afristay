import Credentials from "next-auth/providers/credentials";
import { fetchBackendUser } from "@/lib/api/auth/me";

/**
 * Ouvre la session avec des jetons déjà obtenus de l'API (vérification d'email, connexion Google).
 * Seuls les jetons sont pris au navigateur : identifiant, email, nom et rôle sont relus auprès de l'API avec le
 * jeton d'accès, sinon n'importe qui pourrait se fabriquer une session « admin ».
 */
export const backendSessionProvider = Credentials({
  id: "backend-session",
  name: "Backend Session",
  credentials: {
    accessToken: { label: "Access Token", type: "text" },
    refreshToken: { label: "Refresh Token", type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.accessToken || !credentials?.refreshToken) return null;

    const accessToken = String(credentials.accessToken);
    const user = await fetchBackendUser(accessToken);
    if (!user) return null;

    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email,
      image: user.avatar_url,
      accessToken,
      refreshToken: String(credentials.refreshToken),
      role: user.role,
    };
  },
});
