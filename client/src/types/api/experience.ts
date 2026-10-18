import type { CategorieExperience } from "./admin";

export type { CategorieExperience };

/** Expérience publiée sur la page Découvrir (le client choisit la langue ; un texte anglais vide reprend le français). */
export interface Experience {
  id: number;
  categorie: CategorieExperience;
  nom: string;
  nom_en: string;
  etiquette: string;
  etiquette_en: string;
  ville: string;
  pays: string;
  pays_en: string;
  description: string;
  description_en: string;
  /** FCFA, indicatif ; null : pas de prix affiché. */
  prix: number | null;
  gratuit: boolean;
  image: string | null;
}
