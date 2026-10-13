import type { Metadata } from "next";
import Document, { metadataDuSite } from "@/components/layout/Document";
import EnTeteAgent from "@/components/agent/EnTeteAgent";

// Espace des agents de terrain : en français, jamais indexé
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await metadataDuSite("fr")),
    title: { default: "Visites · Kwa-Ba", template: "%s · Kwa-Ba" },
    robots: { index: false, follow: false },
  };
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Document locale="fr">
      <div className="min-h-screen bg-light">
        <EnTeteAgent />
        <main id="contenu" tabIndex={-1} className="max-w-3xl mx-auto px-4 py-6 outline-none">{children}</main>
      </div>
    </Document>
  );
}
