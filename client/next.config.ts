import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV !== "production";

/** Origine de l'API appelée par le navigateur (figée au build, comme NEXT_PUBLIC_API_URL). */
function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").origin;
  } catch {
    return "";
  }
}

// Politique de sécurité du contenu : le navigateur ne charge que ce qui vient de ces origines. Limite l'impact
// d'une faille XSS (pas de script injecté depuis un autre site, pas d'envoi de données vers un serveur inconnu).
// 'unsafe-inline' reste nécessaire aux scripts d'hydratation de Next.js sans nonce.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  // Photos : API, stockage R2, avatars Google, démo Unsplash (les URL sont filtrées par l'API à l'enregistrement)
  `img-src 'self' data: blob: https:${isDev ? " http:" : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin()} https://accounts.google.com${isDev ? " ws: http://localhost:8000" : ""}`,
  "frame-src https://accounts.google.com https://maps.google.com https://www.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // Les paiements (FedaPay, PayPal) se font par redirection, pas par formulaire : seul le site lui-même reçoit
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // La fenêtre Google Identity Services doit pouvoir communiquer avec la page (popup de connexion)
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Pas d'en-tête « X-Powered-By: Next.js » ni de source maps publiques en production
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // N'embarque que les icônes Phosphor réellement importées
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
