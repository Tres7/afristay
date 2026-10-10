import { CheckCircle, Clock, FileText } from "lucide-react";
import { moisAnnee } from "@/lib/give";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Reversement } from "@/types/api/give";

/** Une ligne de reversement : montant, date et preuve du virement (publique). */
export default function PreuveReversement({ r, avecOrganisation = false }: { r: Reversement; avecOrganisation?: boolean }) {
  const fait = r.statut === "effectue";
  return (
    <li className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4">
      <span className={fait ? "text-secondary" : "text-amber-600"}>{fait ? <CheckCircle size={20} /> : <Clock size={20} />}</span>
      <div className="flex-1 min-w-[12rem]">
        <p className="font-bold text-dark text-sm">
          {avecOrganisation && <>{r.organisation.nom} · </>}Dons de {moisAnnee(r.periode)}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          {formatPrice(r.montant)} · {r.nb_dons} don{r.nb_dons > 1 ? "s" : ""} ·{" "}
          {fait ? `reversés le ${formatDate(r.effectue_le ?? "")}` : `reversement prévu au plus tard le ${formatDate(r.date_prevue)}`}
          {fait && r.reference_operation && <> · réf. {r.reference_operation}</>}
        </p>
        {r.note && <p className="text-xs text-dark mt-1.5 italic">« {r.note} »</p>}
      </div>
      {r.justificatif && (
        <a href={r.justificatif} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5">
          <FileText size={14} /> Preuve du virement<span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
        </a>
      )}
    </li>
  );
}
