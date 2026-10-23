import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { moduleDuChemin, type ReglagesSite } from "@/lib/modules";

// Pages réservées aux utilisateurs connectés (le centre d'aide reste public)
const PROTECTED = ["/profil", "/favoris", "/messages", "/reservation", "/hote/espace", "/backoffice", "/agent", "/give/don"];
const PUBLIC_EXCEPTIONS = ["/profil/aide"];
// Pages d'accueil publiques ; leurs sous-pages (suivi d'un transfert, voyage de groupe, invitation) exigent d'être connecté
const PROTECTED_SUBPATHS = ["/transfert", "/together", "/location"];
// Pages d'authentification inutiles une fois connecté
const GUEST_ONLY = ["/login", "/register"];
// Espaces internes servis hors des routes de langue (app/backoffice, app/agent)
const SANS_LANGUE = ["/backoffice", "/agent"];

// Langue : préfixe /en, sinon cookie NEXT_LOCALE, sinon langue du navigateur (première visite)
const intl = createIntlMiddleware(routing);

/** Chemin sans le préfixe de langue (/en/profil → /profil) et préfixe à remettre dans les redirections. */
function sansLangue(pathname: string) {
  const langue = routing.locales.find((l) => l !== routing.defaultLocale && (pathname === `/${l}` || pathname.startsWith(`/${l}/`)));
  if (!langue) return { chemin: pathname, prefixe: "" };
  return { chemin: pathname.slice(langue.length + 1) || "/", prefixe: `/${langue}` };
}

// Session lue directement dans le cookie, sans le wrapper auth() : avec AUTH_URL (indispensable en production
// derrière nginx), ce wrapper réécrit l'origine de la requête et Next.js traite alors la réécriture de langue
// de next-intl comme un proxy externe (erreur 500 en mode standalone). Le renouvellement des jetons reste
// fait par les routes Auth.js et les composants serveur.
const secureCookie = (process.env.AUTH_URL ?? "").startsWith("https://");

// Modules affichés, relus dans l'API au plus toutes les minutes. API injoignable : tout module est considéré
// comme masqué (état du lancement), pour ne jamais montrer une page qui devait l'être.
const DUREE_MODULES_MS = 60_000;
let modulesEnCache: { valeur: ReglagesSite["modules"] | null; lu: number } = { valeur: null, lu: 0 };

async function modulesAffiches(): Promise<ReglagesSite["modules"] | null> {
  if (Date.now() - modulesEnCache.lu < DUREE_MODULES_MS) return modulesEnCache.valeur;
  const base = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  let valeur: ReglagesSite["modules"] | null = null;
  try {
    const res = await fetch(`${base}/v1/site/`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (res.ok) valeur = ((await res.json()) as ReglagesSite).modules;
  } catch {
    valeur = null;
  }
  modulesEnCache = { valeur, lu: Date.now() };
  return valeur;
}

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });
  const isLoggedIn = !!token && !token.error;
  const { chemin, prefixe } = sansLangue(pathname);

  // Back-office et espace agent n'existent qu'en français, sans préfixe : /en/agent (après une connexion faite
  // sur le site anglais, par ex.) n'a pas de page et ferait échouer le rendu. On renvoie vers /agent.
  if (prefixe && SANS_LANGUE.some((p) => chemin === p || chemin.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL(chemin + search, req.nextUrl.origin));
  }

  // Module masqué (Expériences, Voyager à plusieurs, Give, Concierge) : son adresse renvoie vers l'accueil
  const moduleDeLaPage = moduleDuChemin(chemin);
  if (moduleDeLaPage && !(await modulesAffiches())?.[moduleDeLaPage]) {
    return NextResponse.redirect(new URL(prefixe || "/", req.nextUrl.origin));
  }

  const isProtected =
    (PROTECTED.some((p) => chemin === p || chemin.startsWith(`${p}/`)) ||
      PROTECTED_SUBPATHS.some((p) => chemin.startsWith(`${p}/`))) &&
    !PUBLIC_EXCEPTIONS.some((p) => chemin.startsWith(p));

  if (!isLoggedIn && isProtected) {
    const url = new URL(`${prefixe}/login`, req.nextUrl.origin);
    url.searchParams.set("callbackUrl", chemin + search);
    return NextResponse.redirect(url);
  }

  // Back-office : administrateurs uniquement (l'API vérifie aussi le rôle), en français
  if (chemin.startsWith("/backoffice")) {
    if (isLoggedIn && token?.role !== "admin") {
      return NextResponse.redirect(new URL(prefixe || "/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Espace des agents de terrain (vérification des logements), en français. Confort d'affichage seulement :
  // l'API vérifie le rôle en base à chaque requête.
  if (chemin.startsWith("/agent")) {
    if (isLoggedIn && token?.role !== "agent" && token?.role !== "admin") {
      return NextResponse.redirect(new URL(prefixe || "/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (isLoggedIn && GUEST_ONLY.includes(chemin)) {
    return NextResponse.redirect(new URL(prefixe || "/", req.nextUrl.origin));
  }

  return intl(req);
}

export const config = {
  // Toutes les pages, sauf l'API, les fichiers internes de Next.js et les fichiers statiques
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
