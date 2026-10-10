"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CalendarClock, HandHeart, Percent, Receipt } from "lucide-react";
import api from "@/lib/api";
import { CAUSES, useConfigGive } from "@/lib/give";
import { cn } from "@/lib/utils";
import CarteOrganisation from "@/components/give/CarteOrganisation";
import ChiffresImpact from "@/components/give/ChiffresImpact";
import type { CodeCause, ImpactGlobal, Organisation } from "@/types/api/give";

const ENGAGEMENTS = [
  { icon: BadgeCheck, titre: "ONG vérifiées", texte: "Récépissé officiel, statuts et compte bancaire contrôlés par notre équipe avant toute publication." },
  { icon: Percent, titre: "0 % de commission", texte: "Kwa-Ba ne prélève rien. Vous choisissez d'ajouter les frais de paiement pour que l'ONG reçoive 100 % de votre don." },
  { icon: CalendarClock, titre: "Reversement mensuel", texte: "Les dons d'un mois sont reversés à l'ONG au plus tard le 10 du mois suivant." },
  { icon: Receipt, titre: "Preuves publiées", texte: "Chaque virement est publié avec sa preuve. Vous êtes prévenu quand votre don est reversé." },
];

export default function GivePage() {
  const [cause, setCause] = useState<CodeCause | null>(null);
  const { data: config } = useConfigGive();

  const { data: organisations, isLoading } = useQuery({
    queryKey: ["give", "organisations", cause],
    queryFn: async () =>
      (await api.get<{ results: Organisation[] }>("/v1/give/organisations/", { params: cause ? { cause } : {} })).data.results,
  });
  const { data: impact } = useQuery({
    queryKey: ["give", "impact"],
    queryFn: async () => (await api.get<ImpactGlobal>("/v1/give/impact/")).data,
  });

  return (
    <div className="bg-light pb-12">
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent"><HandHeart size={16} /> Kwa-Ba Give</p>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mt-2 max-w-2xl">Voyagez, et soutenez celles et ceux qui font vivre la région</h1>
          <p className="text-white/85 mt-3 max-w-xl">
            Donnez à des ONG locales vérifiées pour l&apos;éducation, la santé, l&apos;accès à l&apos;eau et l&apos;environnement.
            Dès 500 FCFA, sans commission, avec la preuve de chaque reversement.
          </p>
          <a href="#organisations" className="mt-6 inline-flex items-center gap-2 bg-secondary text-white font-bold px-6 py-3 rounded-xl hover:bg-secondary/90">
            Choisir une ONG <ArrowRight size={18} />
          </a>
          {impact && impact.nb_dons > 0 && <div className="mt-8"><ChiffresImpact impact={impact} clair /></div>}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <section aria-labelledby="causes-titre">
          <h2 id="causes-titre" className="font-heading font-bold text-dark text-xl mb-4">Les causes soutenues</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(config?.causes ?? []).map((c) => {
              const { icon: Icon, couleur } = CAUSES[c.code];
              const actif = cause === c.code;
              return (
                <button key={c.code} type="button" aria-pressed={actif} onClick={() => setCause(actif ? null : c.code)}
                  className={cn("text-left bg-white rounded-2xl border-2 p-4 transition-colors",
                    actif ? "border-primary" : "border-transparent hover:border-primary/30")}>
                  <span className={cn("inline-flex w-10 h-10 rounded-xl items-center justify-center", couleur)}><Icon size={20} /></span>
                  <p className="font-heading font-bold text-dark mt-3">{c.nom}</p>
                  <p className="text-xs text-gray-600 mt-1">{c.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section id="organisations" aria-labelledby="ong-titre" className="scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
            <h2 id="ong-titre" className="font-heading font-bold text-dark text-xl">
              {cause ? `ONG partenaires — ${CAUSES[cause].nom}` : "ONG partenaires"}
            </h2>
            {cause && <button onClick={() => setCause(null)} className="text-sm font-bold text-primary hover:underline">Toutes les causes</button>}
          </div>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-72 skeleton rounded-3xl" />)}</div>
          ) : !organisations?.length ? (
            <p className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">
              Nous vérifions nos premières ONG partenaires{cause ? " pour cette cause" : ""}. Revenez bientôt !
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {organisations.map((o) => <CarteOrganisation key={o.id} o={o} />)}
            </div>
          )}
        </section>

        <section aria-labelledby="engagements-titre">
          <h2 id="engagements-titre" className="font-heading font-bold text-dark text-xl mb-4">Nos engagements de transparence</h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ENGAGEMENTS.map(({ icon: Icon, titre, texte }) => (
              <li key={titre} className="bg-white rounded-2xl border border-gray-100 p-5">
                <Icon size={22} className="text-primary" />
                <p className="font-heading font-bold text-dark mt-3">{titre}</p>
                <p className="text-sm text-gray-600 mt-1">{texte}</p>
              </li>
            ))}
          </ul>
          <Link href="/give/impact" className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-primary hover:underline">
            Voir les montants collectés, reversés et les preuves <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
