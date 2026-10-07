"use client";

import { useConsentement } from "@/providers/ConsentProvider";
import { cn } from "@/lib/utils";

/** Rouvre le panneau de choix des cookies (pied de page, politique cookies). */
export default function GererCookiesBouton({ className, children = "Gérer les cookies" }: { className?: string; children?: React.ReactNode }) {
  const { ouvrirPreferences } = useConsentement();
  return (
    <button type="button" onClick={ouvrirPreferences} className={cn("text-left", className)}>
      {children}
    </button>
  );
}
