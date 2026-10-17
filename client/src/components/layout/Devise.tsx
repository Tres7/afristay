"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn, definirDevise, formatFcfa, type Devise } from "@/lib/utils";

const CLE = "kwaba_devise";
// Back-office et agents : toujours en FCFA (montants réels, versements, factures)
const ESPACES_INTERNES = /^\/(backoffice|agent)(\/|$)/;

const Contexte = createContext<{ devise: Devise; choisir: (d: Devise) => void }>({ devise: "XOF", choisir: () => {} });

export const useDevise = () => useContext(Contexte);

/** Devise d'affichage des prix (FCFA ou euros), mémorisée sur l'appareil. Changer de devise recrée le contenu de
 *  la page : tous les prix (formatPrice) sont réaffichés dans la nouvelle devise. */
export function DeviseProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [choix, setChoix] = useState<Devise>("XOF");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(CLE) === "EUR") setChoix("EUR");
    } catch { /* stockage indisponible : FCFA */ }
  }, []);

  const choisir = useCallback((d: Devise) => {
    setChoix(d);
    try {
      window.localStorage.setItem(CLE, d);
    } catch { /* le choix vaut pour la visite en cours */ }
  }, []);

  const effective: Devise = ESPACES_INTERNES.test(pathname) ? "XOF" : choix;
  // Comme la langue (SynchroLangue) : fixée pendant le rendu, avant les composants qui affichent des prix
  definirDevise(effective);

  return (
    <Contexte.Provider value={{ devise: effective, choisir }}>
      <Fragment key={effective}>{children}</Fragment>
    </Contexte.Provider>
  );
}

/** Bascule FCFA / € (à côté du choix de la langue). */
export function SelecteurDevise({ className, complet = false }: { className?: string; complet?: boolean }) {
  const t = useTranslations("devise");
  const { devise, choisir } = useDevise();
  const options: { valeur: Devise; court: string; long: string }[] = [
    { valeur: "XOF", court: "FCFA", long: t("fcfa") },
    { valeur: "EUR", court: "€", long: t("euro") },
  ];
  return (
    <div role="group" aria-label={t("choisir")} className={cn("inline-flex items-center gap-1 rounded-full border border-gray-200 p-0.5", className)}>
      {options.map((o) => (
        <button key={o.valeur} type="button" onClick={() => choisir(o.valeur)} aria-pressed={o.valeur === devise} title={o.long}
          className={cn("rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
            o.valeur === devise ? "bg-primary text-white" : "text-dark hover:text-primary")}>
          {complet ? o.long : o.court}
        </button>
      ))}
    </div>
  );
}

/** Sous un total affiché en euros : le montant réellement débité, en FCFA (Mobile Money et carte). */
export function MontantDebite({ montant }: { montant: number }) {
  const t = useTranslations("devise");
  const { devise } = useDevise();
  if (devise === "XOF") return null;
  return <span className="block text-xs font-medium text-gray-500 mt-0.5">{t("debite", { montant: formatFcfa(montant) })}</span>;
}
