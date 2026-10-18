"use client";

import { useEffect } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { setApiAccessToken } from "@/lib/api";

// Recopie le token de la session dans le client API (connexion, déconnexion, changement de compte)
// et déconnecte si le refresh token Django a expiré
function SessionTokenSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (session?.error === "RefreshAccessTokenError") {
      setApiAccessToken(null);
      signOut({ callbackUrl: "/login?expired=1" });
      return;
    }
    setApiAccessToken(session?.accessToken || null);
  }, [session, status]);

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    // Relit la session chaque minute tant qu'un onglet est ouvert : chaque lecture prolonge la session de 5 min
    // (session.maxAge dans auth.ts) et renouvelle le token d'accès avant son expiration
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionTokenSync />
      {children}
    </SessionProvider>
  );
}
