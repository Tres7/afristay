import { defineRouting } from "next-intl/routing";

/** Langues du site : le français sans préfixe (kwa-ba.com/…), l'anglais sous /en (kwa-ba.com/en/…). */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  // Cookie NEXT_LOCALE (langue choisie) : 1 an, déclaré dans la politique cookies
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Langue = (typeof routing.locales)[number];
