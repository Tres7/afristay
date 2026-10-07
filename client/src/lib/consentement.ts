/**
 * Consentement aux cookies et contenus tiers (RGPD / recommandations CNIL).
 *
 * Seuls les traceurs non indispensables demandent un accord. Aujourd'hui, une seule catégorie :
 * les contenus tiers (carte Google Maps), qui peuvent déposer leurs propres cookies.
 * Les cookies de connexion et de sécurité (NextAuth) sont strictement nécessaires : pas de consentement.
 */
export interface Consentement {
  version: number;
  /** Date ISO du choix (preuve et durée de validité). */
  date: string;
  contenusTiers: boolean;
}

// À incrémenter quand une nouvelle catégorie ou un nouveau service tiers est ajouté : le choix est redemandé
export const VERSION_CONSENTEMENT = 1;
const CLE = "afristay_consentement";
// La CNIL recommande de redemander le choix au bout de 6 mois
const DUREE_MS = 182 * 24 * 60 * 60 * 1000;
export const EVENEMENT = "afristay:consentement";

export function lireConsentement(): Consentement | null {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return null;
    const c = JSON.parse(brut) as Consentement;
    if (c.version !== VERSION_CONSENTEMENT) return null;
    if (Date.now() - new Date(c.date).getTime() > DUREE_MS) return null;
    return c;
  } catch {
    return null;
  }
}

export function enregistrerConsentement(contenusTiers: boolean): Consentement {
  const c: Consentement = { version: VERSION_CONSENTEMENT, date: new Date().toISOString(), contenusTiers };
  try {
    window.localStorage.setItem(CLE, JSON.stringify(c));
  } catch {
    // Stockage indisponible (navigation privée stricte) : le choix vaut pour la page en cours
  }
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: c }));
  return c;
}
