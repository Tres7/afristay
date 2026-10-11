"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, FileText, HandHeart } from "lucide-react";
import api from "@/lib/api";
import { CAUSES } from "@/lib/give";
import { formatDate, formatPrice } from "@/lib/utils";
import SubPageHeader from "@/components/layout/SubPageHeader";
import type { Don } from "@/types/api/give";

interface ReponseDons {
  results: Don[];
  total_donne: number;
  nb_payes: number;
}

function Suivi({ don }: { don: Don }) {
  if (don.statut === "en_attente") return <span className="flex items-center gap-1 text-amber-700"><Clock size={13} /> Paiement en attente</span>;
  if (don.reversement?.statut === "effectue") {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-secondary">
        <span className="flex items-center gap-1"><CheckCircle size={13} /> Reversé le {formatDate(don.reversement.effectue_le ?? "")}</span>
        {don.reversement.justificatif && (
          <a href={don.reversement.justificatif} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-bold text-primary hover:underline">
            <FileText size={13} /> Preuve<span className="sr-only"> du virement (s&apos;ouvre dans un nouvel onglet)</span>
          </a>
        )}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-gray-600">
      <CheckCircle size={13} className="text-secondary" /> Payé · reversement au plus tard le {formatDate(don.date_reversement ?? "")}
    </span>
  );
}

export default function MesDonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["give", "dons"],
    queryFn: async () => (await api.get<ReponseDons>("/v1/give/dons/")).data,
  });

  return (
    <div className="bg-light min-h-[70vh] pb-12">
      <SubPageHeader title="Mes dons" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {data && data.nb_payes > 0 && (
          <div className="bg-primary text-white rounded-2xl p-5 flex items-center gap-4">
            <HandHeart size={28} className="text-accent flex-shrink-0" />
            <p>Vous avez donné <strong>{formatPrice(data.total_donne)}</strong> en {data.nb_payes} don{data.nb_payes > 1 ? "s" : ""}. Merci !</p>
          </div>
        )}
        {isLoading ? (
          [0, 1].map((i) => <div key={i} className="h-24 skeleton rounded-2xl" />)
        ) : !data?.results.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-600">Vous n&apos;avez pas encore fait de don.</p>
            <Link href="/give" className="inline-block mt-4 bg-secondary text-white font-bold px-5 py-2.5 rounded-xl">Découvrir Kwa-Ba Give</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.results.map((don) => {
              const cause = CAUSES[don.organisation.cause];
              return (
                <li key={don.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cause.couleur}`}><cause.icon size={18} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap justify-between gap-2">
                      <Link href={`/give/${don.organisation.slug}`} className="font-bold text-dark hover:text-primary">{don.organisation.nom}</Link>
                      <span className="font-bold text-dark">{formatPrice(don.montant)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {don.reference} · {formatDate(don.paye_le ?? don.cree_le)}{don.projet && <> · {don.projet.titre}</>} · {formatPrice(don.montant_ong)} pour l&apos;ONG
                    </p>
                    <div className="text-xs mt-2"><Suivi don={don} /></div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
