import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getApiBaseUrl } from "@/lib/api-url";
import { credentialsProvider } from "@/lib/providers/auth/credentials";
import { backendSessionProvider } from "@/lib/providers/auth/backend-session";

// Renouvelle l'access token 30 s avant son expiration
const REFRESH_MARGIN_MS = 30_000;

function decodeExpiry(accessToken?: string): number {
  if (!accessToken) return 0;
  try {
    const payload = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return exp ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/v1/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: token.refreshToken }),
    });
    if (!res.ok) throw new Error(`refresh ${res.status}`);
    const data = (await res.json()) as { access: string; refresh?: string };
    return {
      ...token,
      accessToken: data.access,
      refreshToken: data.refresh ?? token.refreshToken,
      accessTokenExpires: decodeExpiry(data.access),
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [credentialsProvider, backendSessionProvider],
  trustHost: true,

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = decodeExpiry(user.accessToken);
        token.role = user.role;
        token.userId = user.id ?? undefined;
        token.error = undefined;
      }

      // Mise à jour côté client via useSession().update({...})
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.role) token.role = session.role;
      }

      if (!token.refreshToken) return token;
      if (Date.now() < (token.accessTokenExpires ?? 0) - REFRESH_MARGIN_MS) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken ?? "";
      session.user.id = token.userId ?? "";
      session.user.role = token.role ?? "voyageur";
      session.error = token.error;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  session: {
    strategy: "jwt",
    // Aligné sur la durée du refresh token Django (7 jours)
    maxAge: 60 * 60 * 24 * 7,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
