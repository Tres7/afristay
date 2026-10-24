"use client";

import { AC } from "@/components/legal/LegalPage";
import { lienWhatsapp, useReglagesSite, type ReglagesSite } from "@/lib/site";

/**
 * Numéro légal ou de contact lu dans les réglages de l'API (variables SOCIETE_… de server/.env) : il suffit de
 * remplir la variable le jour venu, sans toucher au code. Affiche « à compléter » tant qu'elle est vide.
 */
export default function MentionSociete({ cle, libelle }: { cle: keyof ReglagesSite["mentions"]; libelle: string }) {
  const valeur = useReglagesSite().data?.mentions[cle];
  if (!valeur) return <AC>{libelle}</AC>;
  if (cle === "whatsapp") return <a href={lienWhatsapp(valeur)} target="_blank" rel="noopener noreferrer">{valeur}</a>;
  return <>{valeur}</>;
}
