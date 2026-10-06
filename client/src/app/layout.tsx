import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/Providers";
import AuthProvider from "@/providers/AuthProvider";
import ThemeProvider from "@/providers/ThemeProvider";
import SplashScreen from "@/components/layout/SplashScreen";
import { Toaster } from "sonner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const TITRE = "AfriStay - L'Afrique à portée de clic";
const DESCRIPTION =
  "Plateforme de réservation d'hébergements en Afrique. Découvrez les meilleurs logements, activités et restaurants.";
const IMAGE_PARTAGE = "/brand/png/afristay-partage-1200x630.png";

// Adresse publique du site : les aperçus de lien (WhatsApp, Facebook…) exigent des URL absolues
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITRE,
  description: DESCRIPTION,
  applicationName: "AfriStay",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "AfriStay",
    url: "/",
    title: TITRE,
    description: DESCRIPTION,
    images: [{ url: IMAGE_PARTAGE, width: 1200, height: 630, alt: "AfriStay — L'Afrique à portée de clic" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITRE,
    description: DESCRIPTION,
    images: [IMAGE_PARTAGE],
  },
  icons: {
    apple: "/brand/png/afristay-icone-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${poppins.variable} ${inter.variable} font-body`}>
        <ThemeProvider>
          <AuthProvider>
            <Providers>
              <SplashScreen />
              {children}
              <Toaster
                position="top-center"
                richColors
                toastOptions={{
                  style: { fontFamily: "var(--font-inter)" },
                }}
              />
            </Providers>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
