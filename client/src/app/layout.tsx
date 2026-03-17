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

export const metadata: Metadata = {
  title: "AfriStay - L'Afrique à portée de clic",
  description:
    "Plateforme de réservation d'hébergements en Afrique. Découvrez les meilleurs logements, activités et restaurants.",
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
