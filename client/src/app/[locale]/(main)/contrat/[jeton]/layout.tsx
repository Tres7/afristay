import type { Metadata } from "next";

/** Lien personnel de signature : jamais indexé, jamais transmis en référent. */
export const metadata: Metadata = {
  title: "Contrat",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
