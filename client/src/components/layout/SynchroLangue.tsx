"use client";

import { useLocale } from "next-intl";
import { definirLangue } from "@/lib/utils";

/** Donne la langue courante aux fonctions de format (dates, prix, libellés). Rendu en tête de l'arbre, avant le contenu. */
export default function SynchroLangue() {
  definirLangue(useLocale());
  return null;
}
