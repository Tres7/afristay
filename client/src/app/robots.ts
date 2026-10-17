import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { CHEMINS_PRIVES, SITE_URL } from "@/lib/seo";

const NON_TRADUITS: readonly string[] = ["/backoffice", "/api/"];

/** robots.txt : pages publiques explorées, pages privées (compte, messages, paiement, back-office) exclues. */
export default function robots(): MetadataRoute.Robots {
  const autresLangues = routing.locales.filter((l) => l !== routing.defaultLocale);
  // Pages du site déclinées par langue (/en/…) ; l'API et le back-office n'existent qu'en un exemplaire
  const prives = CHEMINS_PRIVES.flatMap((c) =>
    NON_TRADUITS.includes(c) ? [c] : [c, ...autresLangues.map((l) => `/${l}${c}`)]);
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/profil/aide", ...autresLangues.map((l) => `/${l}/profil/aide`)],
      disallow: prives,
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
