"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import IconeKwaba from "@/components/layout/IconeKwaba";
import { useModule } from "@/lib/site";

/**
 * Accès au Concierge depuis toutes les pages du site (sauf la conversation elle-même et les paiements) : le logo
 * Kwa-Ba flotte contre le bord droit de l'écran, à mi-hauteur, et s'ouvre en onglet au survol.
 * Rien n'est affiché (ni aucune requête envoyée au Concierge) tant que le module est masqué.
 */
export default function BoutonConcierge() {
  const t = useTranslations("concierge");
  const pathname = usePathname();
  const affiche = useModule("concierge");
  if (!affiche || pathname.startsWith("/concierge") || pathname.startsWith("/reservation")) return null;
  return (
    <aside aria-label="Concierge">
      <Link
        href="/concierge"
        title={`Concierge ${t("ia")}`}
        aria-label={`Concierge ${t("ia")}`}
        className="group fixed z-40 right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 pl-2 pr-2 py-2 rounded-l-2xl bg-white border border-r-0 border-gray-200 shadow-xl hover:pr-3 transition-all"
      >
        <IconeKwaba taille={40} className="flex-shrink-0" />
        <span className="hidden group-hover:inline group-focus-visible:inline text-sm font-bold text-dark whitespace-nowrap">Concierge {t("ia")}</span>
      </Link>
    </aside>
  );
}
