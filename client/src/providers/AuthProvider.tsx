"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { setApiAccessToken } from "@/lib/api";

// Recopie le token de la session dans le client API (connexion, déconnexion, changement de compte)
function SessionTokenSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    setApiAccessToken(session?.accessToken || null);
  }, [session, status]);

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionTokenSync />
      {children}
    </SessionProvider>
  );
}
