/**
 * Quartiers de Lomé proposés dans le champ destination. Les choisir cherche ce nom dans la ville et l'adresse des
 * annonces (filtre city de l'API).
 */
export const QUARTIERS_LOME = [
  "Adakpamé", "Adidogomé", "Agbalépédogan", "Agoè", "Amoutivé", "Avédji", "Baguida", "Bè", "Bè Kpota", "Cacavéli",
  "Djidjolé", "Gbossimé", "Hanoukopé", "Hédzranawoé", "Kégué", "Kodjoviakopé", "Lomé 2", "Nyékonakpoè", "Tokoin",
  "Totsi",
];

const sansAccents = (texte: string) => texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Quartiers dont le nom contient la saisie, sans tenir compte des accents ni des majuscules (« nyeko » → Nyékonakpoè). */
export function quartiersCorrespondants(saisie: string): string[] {
  const s = sansAccents(saisie.trim());
  if (!s) return [];
  return QUARTIERS_LOME.filter((q) => sansAccents(q).includes(s));
}
