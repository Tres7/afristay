"use client";

import { useConsentement } from "@/providers/ConsentProvider";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Rouvre le panneau de choix des cookies (pied de page, politique de cookies). */
export default function GererCookiesBouton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { ouvrirPreferences } = useConsentement();
  const t = useTranslations("cookies");
  return (
    <button type="button" onClick={ouvrirPreferences} className={cn("text-left", className)}>
      {children ?? t("gerer")}
    </button>
  );
}
