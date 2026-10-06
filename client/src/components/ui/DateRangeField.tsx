"use client";

import { useMemo } from "react";
import { Calendar, X } from "lucide-react";
import DateRangeCalendar from "@/components/calendrier/DateRangeCalendar";
import Floating from "@/components/ui/Floating";
import { usePopover } from "@/lib/usePopover";
import { calculateNights, cn, formatDate } from "@/lib/utils";

interface DateRangeFieldProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** « hero » : deux colonnes intégrées à la barre de recherche ; « field » : deux champs encadrés. */
  variant?: "hero" | "field";
  className?: string;
}

const AUCUNE = new Set<string>();

/** Choix arrivée / départ avec notre calendrier (identique sur tous les navigateurs et téléphones). */
export default function DateRangeField({ checkIn, checkOut, onChange, variant = "field", className }: DateRangeFieldProps) {
  const { open, setOpen, ref, panelRef } = usePopover();
  const nuits = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);

  const choisir = (a: string, d: string) => {
    onChange(a, d);
    if (a && d) setOpen(false);
  };

  const libelle = (v: string) => (v ? formatDate(v, { day: "numeric", month: "short" }) : "Ajouter");

  const moitie = (titre: string, valeur: string) => (
    <button
      type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog"
      className={cn(
        "flex-1 min-w-0 text-left",
        variant === "hero" ? "px-5 py-3 hover:bg-gray-50 md:rounded-full" : "px-4 py-3 hover:bg-gray-50",
      )}
    >
      <span className="block text-[11px] font-bold text-dark uppercase tracking-wide">{titre}</span>
      <span className="flex items-center gap-2 mt-1">
        <Calendar size={16} className="text-primary flex-shrink-0 hidden sm:block" />
        <span className={cn("text-base md:text-sm font-medium truncate", valeur ? "text-dark" : "text-gray-400")}>{libelle(valeur)}</span>
      </span>
    </button>
  );

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className={cn("flex divide-x divide-gray-100", variant === "field" && "border border-gray-200 rounded-xl bg-white overflow-hidden", open && variant === "field" && "border-primary ring-2 ring-primary/20")}>
        {moitie("Arrivée", checkIn)}
        {moitie("Départ", checkOut)}
      </div>

      {open && (
        <Floating ref={panelRef} anchor={ref} width={680} sheetOnMobile onClose={() => setOpen(false)} label="Choisir les dates du séjour" className="md:p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-heading font-bold text-dark">
              {nuits > 0 ? `${nuits} nuit${nuits > 1 ? "s" : ""} · ${libelle(checkIn)} → ${libelle(checkOut)}` : "Quand partez-vous ?"}
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
              <X size={18} />
            </button>
          </div>
          <DateRangeCalendar checkIn={checkIn} checkOut={checkOut} onChange={choisir} indisponibles={AUCUNE} count={2} />
        </Floating>
      )}
    </div>
  );
}
