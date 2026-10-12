import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { langueDe, lireApi, metadataPage } from "@/lib/seo";
import { libelleType } from "@/lib/utils";
import type { Hebergement } from "@/types/api/models";

const LONGUEUR_DESCRIPTION = 155;

function resume(texte: string): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= LONGUEUR_DESCRIPTION) return propre;
  return `${propre.slice(0, LONGUEUR_DESCRIPTION).replace(/\s+\S*$/, "")}…`;
}

/**
 * Fiche logement : titre, description et photo du logement, rendus par le serveur pour Google et les aperçus de
 * lien (WhatsApp, Facebook). La page elle-même reste un composant client.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: brut, id } = await params;
  const locale = langueDe(brut);
  const t = await getTranslations({ locale, namespace: "meta.pages" });
  const chemin = `/hebergements/${id}`;

  const h = await lireApi<Hebergement>(`/v1/hebergements/${encodeURIComponent(id)}/`);
  if (!h) {
    return metadataPage({ locale, chemin, titre: t("logementIntrouvable.titre"), indexable: false });
  }

  const prix = Math.round(Number(h.price_per_night)).toLocaleString(locale === "en" ? "en-GB" : "fr-FR").replace(/ /g, " ");
  const accroche = t("logementDescription", { type: libelleType(h.type, locale), ville: h.city, voyageurs: h.max_guests, prix });
  return metadataPage({
    locale,
    chemin,
    titre: `${h.name} · ${libelleType(h.type, locale)} ${locale === "en" ? "in" : "à"} ${h.city}`,
    // Texte de l'hôte quand il est assez long (contenu unique pour Google), sinon une phrase générée
    description: (h.description ?? "").trim().length >= 60 ? resume(h.description) : accroche,
    image: h.image_url || null,
    // Annonce masquée par l'hôte : la page reste consultable mais ne doit pas apparaître dans Google
    indexable: h.is_available,
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
