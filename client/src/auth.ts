import NextAuth from "next-auth";
import { getApiBaseUrl } from "@/lib/api-url";
import { credentialsProvider } from "@/lib/providers/auth/credentials";
import { backendSessionProvider } from "@/lib/providers/auth/backend-session";


const API_URL = getApiBaseUrl();


export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [credentialsProvider, backendSessionProvider],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken;
        token.role = (user as { role?: string }).role;
        token.userId = user.id ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = (token.accessToken as string) ?? "";
      session.user.id = (token.userId as string) ?? "";
      session.user.role = (token.role as string) ?? "voyageur";
      return session;
    },
  },

  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
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
