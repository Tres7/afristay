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
    // Rafraîchit la session toutes les 5 min : le token mis en cache reste valide (durée de vie 60 min)
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <SessionTokenSync />
      {children}
    </SessionProvider>
  );
}
