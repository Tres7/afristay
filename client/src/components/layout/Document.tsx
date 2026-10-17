import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "@/app/globals.css";
import Providers from "@/providers/Providers";
import ConsentProvider from "@/providers/ConsentProvider";
import AuthProvider from "@/providers/AuthProvider";
import ThemeProvider from "@/providers/ThemeProvider";
import SplashScreen from "@/components/layout/SplashScreen";
import SynchroLangue from "@/components/layout/SynchroLangue";
import { DeviseProvider } from "@/components/layout/Devise";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { Langue } from "@/i18n/routing";
import { IMAGE_PARTAGE, SITE_URL } from "@/lib/seo";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

/**
 * Valeurs par défaut de toutes les pages. Pas d'URL canonique ni de versions linguistiques ici : elles sont
 * propres à chaque page (lib/seo.ts), sinon toutes les pages se déclareraient variantes de l'accueil.
 */
export async function metadataDuSite(locale: Langue): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const titre = t("titre");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: titre, template: "%s · Kwa-Ba" },
    description: t("description"),
    applicationName: "Kwa-Ba",
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : "fr_FR",
      alternateLocale: locale === "en" ? "fr_FR" : "en_GB",
      siteName: "Kwa-Ba",
      title: titre,
      description: t("description"),
      images: [{ url: IMAGE_PARTAGE, width: 1200, height: 630, alt: t("slogan") }],
    },
    twitter: { card: "summary_large_image", title: titre, description: t("description"), images: [IMAGE_PARTAGE] },
    icons: { apple: "/brand/kwaba-icone-180.png" },
  };
}

/**
 * Page HTML complète (polices, fournisseurs, lien d'évitement) dans une langue donnée.
 * Rendue par app/[locale]/layout.tsx : changer de langue reconstruit tout l'arbre,
 * textes des composants client compris.
 */
export default async function Document({ locale, children }: { locale: Langue; children: React.ReactNode }) {
  const t = await getTranslations({ locale, namespace: "commun" });
  const messages = await getMessages({ locale });
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${montserrat.variable} ${inter.variable} font-body`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
        <SynchroLangue />
        <ThemeProvider>
          <AuthProvider>
            <Providers>
              <ConsentProvider>
              {/* Lien d'évitement : premier élément atteint au clavier */}
              <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-3 focus:rounded-xl focus:bg-dark focus:text-white focus:font-bold">
                {t("allerAuContenu")}
              </a>
              <SplashScreen />
              <DeviseProvider>{children}</DeviseProvider>
              <Toaster
                position="top-center"
                richColors
                toastOptions={{
                  style: { fontFamily: "var(--font-inter)" },
                }}
              />
              </ConsentProvider>
            </Providers>
          </AuthProvider>
        </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
