import type { MetadataRoute } from "next";
import { cheminLocalise, lireApi, PAGES_PUBLIQUES, SITE_URL, versionsLinguistiques } from "@/lib/seo";
import type { Hebergement } from "@/types/api/models";
import type { Organisation } from "@/types/api/give";

// Calculé à la demande (jamais au build, où l'API n'est pas joignable) ; les lectures de l'API sont mises en
// cache une heure (lireApi)
export const dynamic = "force-dynamic";

const PRIORITES: Record<string, number> = { "/": 1, "/recherche": 0.9 };

type Entree = MetadataRoute.Sitemap[number];

/** Une URL par langue, chacune annonçant ses deux versions (hreflang) : Google relie /x et /en/x. */
function entrees(chemin: string, extra: Partial<Entree> = {}): MetadataRoute.Sitemap {
  const absolues = Object.fromEntries(
    Object.entries(versionsLinguistiques(chemin)).filter(([langue]) => langue !== "x-default")
      .map(([langue, url]) => [langue, `${SITE_URL}${url}`]),
  );
  return (["fr", "en"] as const).map((locale) => ({
    url: `${SITE_URL}${cheminLocalise(locale, chemin)}`,
    alternates: { languages: absolues },
    ...extra,
  }));
}

/** sitemap.xml : pages publiques, logements disponibles et associations Give, en français et en anglais. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [logements, organisations] = await Promise.all([
    lireApi<{ results: Hebergement[] }>("/v1/hebergements/", 3600),
    lireApi<{ results: Organisation[] }>("/v1/give/organisations/", 3600),
  ]);

  return [
    ...PAGES_PUBLIQUES.flatMap((chemin) => entrees(chemin, { priority: PRIORITES[chemin] ?? 0.5 })),
    ...(logements?.results ?? []).flatMap((h) =>
      entrees(`/hebergements/${h.id}`, { priority: 0.8, changeFrequency: "weekly" })),
    ...(organisations?.results ?? []).flatMap((o) => entrees(`/give/${o.slug}`, { priority: 0.6 })),
  ];
}
