"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import Floating from "@/components/ui/Floating";
import Stepper from "@/components/ui/Stepper";
import { usePopover } from "@/lib/usePopover";
import { cn } from "@/lib/utils";

interface GuestsFieldProps {
  value: number;
  onChange: (total: number) => void;
  max?: number;
  /** Apparence du déclencheur : « field » (champ encadré) ou « bare » (dans une barre de recherche). */
  variant?: "field" | "bare";
  className?: string;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Choix du nombre de voyageurs : panneau avec adultes et enfants, total transmis au parent. */
export default function GuestsField({ value, onChange, max = 16, variant = "field", className }: GuestsFieldProps) {
  const { open, setOpen, ref, panelRef } = usePopover();
  // La réservation ne stocke qu'un total : la répartition sert au confort de saisie
  const [enfants, setEnfants] = useState(0);
  const adultes = Math.max(1, value - enfants);

  const maj = (a: number, e: number) => {
    setEnfants(e);
    onChange(a + e);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog"
        className={cn(
          "w-full flex items-center gap-2 text-left",
          variant === "field" && "h-full border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-gray-300",
          open && variant === "field" && "border-primary ring-2 ring-primary/20",
        )}
      >
        <Users size={16} className="text-primary flex-shrink-0" />
        <span className="flex-1 min-w-0 text-base md:text-sm font-medium text-dark truncate">
          {pluriel(value, "voyageur")}
        </span>
        <ChevronDown size={16} className={cn("text-gray-400 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <Floating ref={panelRef} anchor={ref} width={320} align="end" sheetOnMobile onClose={() => setOpen(false)} label="Nombre de voyageurs" className="p-5 space-y-5">
          <Stepper label="Adultes" hint="13 ans et plus" value={adultes} min={1} max={max - enfants} onChange={(a) => maj(a, enfants)} />
          <Stepper label="Enfants" hint="De 2 à 12 ans" value={enfants} min={0} max={max - adultes} onChange={(e) => maj(adultes, e)} />
          <p className="text-xs text-muted">Les bébés de moins de 2 ans ne sont pas comptés.{max < 16 ? ` Maximum ${max} voyageurs pour ce logement.` : ""}</p>
          <div className="flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="px-5 py-2 rounded-xl bg-dark text-white text-sm font-bold">Valider</button>
          </div>
        </Floating>
      )}
    </div>
  );
}
