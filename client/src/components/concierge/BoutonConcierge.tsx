"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

/** Accès au Concierge depuis toutes les pages du site (sauf la conversation elle-même et les paiements). */
export default function BoutonConcierge() {
  const pathname = usePathname();
  if (pathname.startsWith("/concierge") || pathname.startsWith("/reservation")) return null;
  return (
    <Link
      href="/concierge"
      className="fixed z-40 bottom-5 right-5 flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full bg-dark text-white text-sm font-bold shadow-xl hover:bg-dark/90 transition-colors"
    >
      <Sparkles size={18} className="text-accent" /> <span>Concierge<span className="hidden sm:inline"> IA</span></span>
    </Link>
  );
}
