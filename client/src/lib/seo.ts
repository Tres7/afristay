import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Langue } from "@/i18n/routing";

/** Adresse publique du site, sans « / » final : URL absolues du sitemap, des aperçus de lien et des canoniques. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

export const IMAGE_PARTAGE = "/brand/kwaba-partage-1200x630.png";

/** Pages publiques indexables (sans préfixe de langue). Les fiches de logement et d'associations s'y ajoutent. */
export const PAGES_PUBLIQUES = [
  "/", "/recherche", "/decouvrir", "/transfert", "/together", "/concierge", "/hote",
  "/give", "/give/impact", "/profil/aide",
  "/cgu", "/confidentialite", "/cookies", "/mentions-legales", "/remboursement",
] as const;

/**
 * Pages privées ou sans intérêt pour un moteur de recherche (robots.txt) : elles redirigent vers la connexion ou
 * n'affichent que les données de l'utilisateur. /profil/aide (centre d'aide) reste public.
 */
export const CHEMINS_PRIVES = [
  "/profil", "/favoris", "/messages", "/reservation", "/hote/espace", "/give/don", "/together/", "/transfert/",
  "/login", "/register", "/verify", "/mot-de-passe-oublie", "/backoffice", "/api/",
] as const;

export function langueDe(valeur: string): Langue {
  return hasLocale(routing.locales, valeur) ? valeur : routing.defaultLocale;
}

/** Chemin public d'une page dans une langue : /recherche (français) ou /en/recherche (anglais). */
export function cheminLocalise(locale: Langue, chemin: string): string {
  if (locale === routing.defaultLocale) return chemin;
  return chemin === "/" ? `/${locale}` : `/${locale}${chemin}`;
}

/** Les deux versions linguistiques d'une page, et la version française par défaut (hreflang x-default). */
export function versionsLinguistiques(chemin: string): Record<string, string> {
  return {
    fr: cheminLocalise("fr", chemin),
    en: cheminLocalise("en", chemin),
    "x-default": cheminLocalise(routing.defaultLocale, chemin),
  };
}

interface PageSeo {
  locale: Langue;
  /** Chemin sans préfixe de langue, ex. /hebergements/<id> */
  chemin: string;
  titre: string;
  description?: string;
  image?: string | null;
  /** Titre affiché tel quel, sans « · Kwa-Ba » (page d'accueil). */
  titreComplet?: boolean;
  indexable?: boolean;
}

/**
 * Métadonnées d'une page publique : titre, description, URL canonique, versions FR / EN et aperçu de lien.
 * Chaque page indexable doit les fournir : sans elles, Google ne sait ni quelle URL retenir ni quelle est
 * la version dans l'autre langue (Next.js remplace le bloc openGraph du parent au lieu de le fusionner).
 */
export function metadataPage({ locale, chemin, titre, description, image, titreComplet, indexable = true }: PageSeo): Metadata {
  const url = cheminLocalise(locale, chemin);
  const images = image ? [{ url: image }] : [{ url: IMAGE_PARTAGE, width: 1200, height: 630 }];
  return {
    title: titreComplet ? { absolute: titre } : titre,
    description,
    alternates: { canonical: url, languages: versionsLinguistiques(chemin) },
    openGraph: {
      type: "website",
      siteName: "Kwa-Ba",
      locale: locale === "en" ? "en_GB" : "fr_FR",
      alternateLocale: locale === "en" ? "fr_FR" : "en_GB",
      url,
      title: titre,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title: titre, description, images: images.map((i) => i.url) },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * Page privée sous une page publique (/transfert/<id>, /together/<id>…) : garde le titre de sa section mais n'est
 * ni indexée ni rattachée à l'URL canonique de la page publique dont elle hérite.
 */
export const METADATA_PRIVEE: Metadata = {
  alternates: { canonical: null, languages: {} },
  robots: { index: false, follow: false },
};

/** Métadonnées d'une page dont le titre et la description sont dans messages/*.json (meta.pages.<cle>). */
export async function metadataTraduite(params: Promise<{ locale: string }>, cle: string, chemin: string): Promise<Metadata> {
  const locale = langueDe((await params).locale);
  const t = await getTranslations({ locale, namespace: "meta.pages" });
  return metadataPage({ locale, chemin, titre: t(`${cle}.titre`), description: t(`${cle}.description`) });
}

/** Lecture de l'API côté serveur (sitemap, métadonnées) : mise en cache, null si l'API ne répond pas. */
export async function lireApi<T>(chemin: string, revalidate = 600): Promise<T | null> {
  const base = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  try {
    const res = await fetch(`${base}${chemin}`, { next: { revalidate }, signal: AbortSignal.timeout(5000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
