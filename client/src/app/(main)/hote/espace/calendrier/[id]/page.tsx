"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { addDays, calculateNights, cn, formatDate, isoDate } from "@/lib/utils";
import { useDisponibilites, type PeriodeIndispo } from "@/lib/useDisponibilites";
import MonthGrid from "@/components/calendrier/MonthGrid";
import SubPageHeader from "@/components/layout/SubPageHeader";
import type { Hebergement } from "@/types/api/models";

export default function CalendrierHotePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const today = isoDate();
  const [month, setMonth] = useState(() => new Date());
  // Sélection en nuits (bornes incluses) : du soir de `debut` au soir de `fin`
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const { data: hebergement } = useQuery({
    queryKey: ["hebergement", id, "hote"],
    queryFn: async () => (await api.get<Hebergement>(`/v1/hebergements/${id}/`)).data,
  });
  const { data: periodes = [], isLoading } = useDisponibilites(id, 540);

  // Pour chaque nuit occupée : la période qui la couvre (réservation ou fermeture)
  const parNuit = useMemo(() => {
    const m = new Map<string, PeriodeIndispo>();
    for (const p of periodes) for (let d = p.debut; d < p.fin; d = addDays(d, 1)) m.set(d, p);
    return m;
  }, [periodes]);

  const selectionLibre = (a: string, b: string) => {
    for (let d = a; d <= b; d = addDays(d, 1)) if (parNuit.has(d)) return false;
    return true;
  };

  const clic = (iso: string) => {
    if (parNuit.has(iso) || iso < today) return;
    if (!debut || fin || iso < debut) {
      setDebut(iso);
      setFin("");
    } else if (selectionLibre(debut, iso)) {
      setFin(iso);
    } else {
      toast.error("La sélection ne peut pas inclure de nuit déjà réservée ou fermée.");
    }
  };

  const finSel = fin || debut;

  const renderDay = (iso: string) => {
    const p = parNuit.get(iso);
    const passe = iso < today;
    const selectionne = !!debut && iso >= debut && iso <= finSel;
    return {
      disabled: passe || !!p,
      title: p ? (p.type === "reservation" ? `Réservé — ${p.voyageur}` : `Fermé${p.motif ? ` — ${p.motif}` : ""}`) : undefined,
      className: cn(
        "rounded-lg mx-0.5",
        passe && "text-gray-300",
        !passe && !p && !selectionne && "text-dark hover:bg-gray-100 font-medium",
        p?.type === "reservation" && !passe && "bg-blue-100 text-blue-800 font-semibold",
        p?.type === "blocage" && !passe && "bg-[repeating-linear-gradient(135deg,#f3f4f6,#f3f4f6_4px,#e5e7eb_4px,#e5e7eb_8px)] text-gray-500 line-through",
        selectionne && "bg-dark text-white font-bold",
      ),
    };
  };

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["disponibilites", id] });

  const fermer = async () => {
    if (!debut) return;
    setEnvoi(true);
    try {
      await api.post(`/v1/hebergements/${id}/blocages/`, { debut, fin: addDays(finSel, 1), motif: motif.trim() });
      toast.success("Dates fermées à la réservation");
      setDebut(""); setFin(""); setMotif("");
      rafraichir();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setEnvoi(false);
    }
  };

  const rouvrir = async (p: PeriodeIndispo) => {
    try {
      await api.delete(`/v1/hebergements/blocages/${p.id}/`);
      toast.success("Dates rouvertes");
      rafraichir();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const aVenir = periodes.filter((p) => p.fin > today);
  const nbNuits = debut ? calculateNights(debut, addDays(finSel, 1)) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <SubPageHeader title="Calendrier" subtitle={hebergement?.name ?? "…"} back="/hote/espace" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-card p-4 sm:p-6">
          {isLoading ? <div className="h-80 skeleton rounded-2xl" /> : (
            <MonthGrid month={month} onMonthChange={setMonth} count={2} minMonth={new Date()} renderDay={renderDay} onDayClick={clic} />
          )}
          <div className="flex flex-wrap gap-4 mt-5 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white border border-gray-200" /> Libre</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-100" /> Réservé</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-[repeating-linear-gradient(135deg,#f3f4f6,#f3f4f6_3px,#e5e7eb_3px,#e5e7eb_6px)]" /> Fermé par vous</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-card p-5">
            <h2 className="font-heading font-bold text-dark mb-2 flex items-center gap-2"><Lock size={16} className="text-primary" /> Fermer des dates</h2>
            {!debut ? (
              <p className="text-sm text-muted">Touchez une première nuit libre, puis la dernière nuit à fermer (travaux, usage personnel, location hors Kwa-Ba…).</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-dark">
                  Nuits du <strong>{formatDate(debut, { day: "numeric", month: "long" })}</strong> au <strong>{formatDate(finSel, { day: "numeric", month: "long" })}</strong>
                  <span className="text-muted"> ({nbNuits} nuit{nbNuits > 1 ? "s" : ""})</span>
                </p>
                {!fin && <p className="text-xs text-muted">Touchez une autre nuit pour étendre la période.</p>}
                <input value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={120} placeholder="Motif (visible par vous seul)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base sm:text-sm outline-none focus:border-primary" />
                <div className="flex gap-2">
                  <button onClick={() => { setDebut(""); setFin(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Annuler</button>
                  <button onClick={fermer} disabled={envoi} className="flex-1 py-2.5 rounded-xl bg-dark text-white text-sm font-bold disabled:opacity-50">
                    {envoi ? "..." : "Fermer ces dates"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-card p-5">
            <h2 className="font-heading font-bold text-dark mb-3">À venir</h2>
            {aVenir.length === 0 ? (
              <p className="text-sm text-muted">Aucune réservation ni fermeture à venir.</p>
            ) : (
              <ul className="space-y-2">
                {aVenir.map((p) => (
                  <li key={`${p.type}-${p.id}`} className={cn("rounded-xl p-3 text-sm flex items-start justify-between gap-2", p.type === "reservation" ? "bg-blue-50" : "bg-gray-50")}>
                    <div className="min-w-0">
                      <p className="font-semibold text-dark">
                        {p.type === "blocage"
                          ? `Nuits du ${formatDate(p.debut, { day: "numeric", month: "short" })} au ${formatDate(addDays(p.fin, -1), { day: "numeric", month: "short" })}`
                          : `${formatDate(p.debut, { day: "numeric", month: "short" })} → ${formatDate(p.fin, { day: "numeric", month: "short" })}`}
                      </p>
                      <p className="text-xs text-gray-600 flex items-center gap-1 truncate">
                        {p.type === "reservation" ? <><User size={12} /> {p.voyageur} · {p.reference}</> : <><Lock size={12} /> {p.motif || "Fermé"}</>}
                      </p>
                    </div>
                    {p.type === "blocage" && (
                      <button onClick={() => rouvrir(p)} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline flex-shrink-0">
                        <Trash2 size={13} /> Rouvrir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/hote/espace" className="block mt-4 text-sm font-semibold text-primary hover:underline">Voir toutes les réservations</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
