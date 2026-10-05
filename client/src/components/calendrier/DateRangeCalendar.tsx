"use client";

import { useState } from "react";
import { addMonths } from "date-fns";
import MonthGrid from "@/components/calendrier/MonthGrid";
import { addDays, cn, isoDate } from "@/lib/utils";

interface DateRangeCalendarProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Nuits indisponibles (AAAA-MM-JJ). */
  indisponibles: Set<string>;
  count?: number;
  /** Tant que les disponibilités chargent, aucun jour n'est sélectionnable. */
  chargement?: boolean;
}

/** Première nuit prise après `depuis` : on ne peut pas partir au-delà de ce jour. */
function limiteDepart(depuis: string, indisponibles: Set<string>, max: string): string {
  for (let d = depuis; d < max; d = addDays(d, 1)) if (indisponibles.has(d)) return d;
  return max;
}

export default function DateRangeCalendar({ checkIn, checkOut, onChange, indisponibles, count = 1, chargement = false }: DateRangeCalendarProps) {
  const today = isoDate();
  const maxDate = addDays(today, 365);
  const [month, setMonth] = useState(() => new Date(`${checkIn || today}T00:00:00`));
  const [survol, setSurvol] = useState<string | null>(null);

  const choixDepart = !!checkIn && !checkOut;
  const limite = choixDepart ? limiteDepart(checkIn, indisponibles, maxDate) : null;
  const finAffichee = checkOut || (choixDepart && survol && survol > checkIn && survol <= (limite ?? maxDate) ? survol : "");

  const clic = (iso: string) => {
    if (choixDepart && iso > checkIn && limite && iso <= limite) {
      onChange(checkIn, iso);
      return;
    }
    // Nouvelle arrivée (ou correction de l'arrivée)
    if (!indisponibles.has(iso)) onChange(iso, "");
  };

  const renderDay = (iso: string) => {
    const passe = iso < today || iso > maxDate;
    const prise = indisponibles.has(iso);
    const departPossible = choixDepart && iso > checkIn && !!limite && iso <= limite;
    // Un jour libre reste toujours cliquable (nouvelle arrivée) ; une nuit prise ne l'est que comme jour de départ
    const bloque = passe || (prise && !departPossible);
    const debut = iso === checkIn;
    const fin = iso === finAffichee;
    const dedans = !!checkIn && !!finAffichee && iso > checkIn && iso < finAffichee;

    return {
      disabled: bloque && !debut,
      title: prise && !passe ? "Indisponible" : departPossible && prise ? "Départ possible" : undefined,
      className: cn(
        dedans && "bg-primary/10 text-dark",
        (debut || fin) && "bg-primary text-white font-bold",
        debut && finAffichee && "rounded-l-full",
        fin && "rounded-r-full",
        debut && !finAffichee && "rounded-full",
        !debut && !fin && !dedans && !bloque && "rounded-full hover:bg-gray-100 text-dark font-medium",
        bloque && !debut && "text-gray-300 cursor-not-allowed",
        prise && !passe && !departPossible && !debut && "line-through decoration-gray-300",
      ),
    };
  };

  if (chargement) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-muted" role="status">
        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        Chargement des disponibilités…
      </div>
    );
  }

  return (
    <div>
      <MonthGrid
        month={month} onMonthChange={setMonth} count={count}
        minMonth={new Date()} maxMonth={addMonths(new Date(), 12)}
        renderDay={renderDay} onDayClick={clic} onDayHover={setSurvol}
      />
      <div className="flex items-center justify-between mt-3 text-xs text-muted">
        <span>{!checkIn ? "Choisissez votre date d'arrivée" : !checkOut ? "Choisissez votre date de départ" : "Dates sélectionnées"}</span>
        {(checkIn || checkOut) && (
          <button type="button" onClick={() => onChange("", "")} className="font-semibold text-dark underline">Effacer</button>
        )}
      </div>
    </div>
  );
}
