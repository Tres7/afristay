import { metadataTraduite } from "@/lib/seo";

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return metadataTraduite(params, "recherche", "/recherche");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
