import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  // N'embarque que les icônes Phosphor réellement importées
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
