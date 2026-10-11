"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Langue } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const NOMS: Record<Langue, string> = { fr: "Français", en: "English" };

/** Bascule FR / EN en restant sur la même page (le choix est mémorisé dans le cookie NEXT_LOCALE). */
export default function SelecteurLangue({ className, complet = false }: { className?: string; complet?: boolean }) {
  const locale = useLocale() as Langue;
  const t = useTranslations("langue");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  const choisir = (langue: Langue) => {
    if (langue === locale) return;
    const requete = searchParams.toString();
    demarrer(() => router.replace(requete ? `${pathname}?${requete}` : pathname, { locale: langue, scroll: false }));
  };

  return (
    <div role="group" aria-label={t("choisir")} className={cn("inline-flex items-center gap-1 rounded-full border border-gray-200 p-0.5", enCours && "opacity-60", className)}>
      {!complet && <Globe size={14} className="text-gray-400 ml-1.5" aria-hidden />}
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => choisir(l)}
          aria-pressed={l === locale}
          title={NOMS[l]}
          className={cn("rounded-full px-2.5 py-1 text-xs font-bold uppercase transition-colors",
            l === locale ? "bg-primary text-white" : "text-dark hover:text-primary")}
        >
          {complet ? NOMS[l] : l}
        </button>
      ))}
    </div>
  );
}
