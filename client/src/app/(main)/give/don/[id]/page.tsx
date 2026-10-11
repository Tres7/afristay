"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle, HandHeart, Loader2, XCircle } from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Don } from "@/types/api/give";

const ATTENTE_MAX_MS = 3 * 60 * 1000;

function RetourDon() {
  const { id } = useParams<{ id: string }>();
  const annule = useSearchParams().get("annule") === "1";
  const [debut] = useState(() => Date.now());

  const { data: don, isError } = useQuery({
    queryKey: ["give", "don", id],
    queryFn: async () => (await api.get<Don>(`/v1/give/dons/${id}/`)).data,
    refetchInterval: (q) => (q.state.data?.statut === "en_attente" && !annule && Date.now() - debut < ATTENTE_MAX_MS ? 3000 : false),
    retry: false,
  });

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="font-heading font-bold text-xl text-dark">Don introuvable</p>
        <Link href="/profil/dons" className="text-primary font-bold hover:underline">Mes dons</Link>
      </div>
    );
  }
  if (!don) return <div className="max-w-xl mx-auto px-4 py-10"><div className="h-80 skeleton rounded-3xl" /></div>;

  const enAttente = don.statut === "en_attente" && !annule && Date.now() - debut < ATTENTE_MAX_MS;
  const echoue = don.statut === "echoue" || (don.statut === "en_attente" && !enAttente);

  return (
    <div className="bg-light min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-card border border-gray-100 p-6 sm:p-8" aria-live="polite">
        {don.statut === "paye" ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary/10 text-secondary flex items-center justify-center"><HandHeart size={30} /></div>
            <h1 className="font-heading font-bold text-dark text-2xl mt-4">Merci pour votre don !</h1>
            <p className="text-gray-600 mt-2">
              {formatPrice(don.montant_ong)} iront à <strong className="text-dark">{don.organisation.nom}</strong>
              {don.projet && <> pour « {don.projet.titre} »</>}. Une confirmation vous a été envoyée par email.
            </p>
          </div>
        ) : enAttente ? (
          <div className="text-center">
            <Loader2 size={36} className="mx-auto animate-spin text-primary" />
            <h1 className="font-heading font-bold text-dark text-xl mt-4">Confirmation du paiement…</h1>
            <p className="text-sm text-gray-600 mt-2">Si vous payez par Mobile Money, validez la demande sur votre téléphone.</p>
          </div>
        ) : echoue && (
          <div className="text-center">
            <XCircle size={40} className="mx-auto text-red-600" />
            <h1 className="font-heading font-bold text-dark text-xl mt-4">{annule ? "Paiement annulé" : "Le paiement n'a pas abouti"}</h1>
            <p className="text-sm text-gray-600 mt-2">Aucun don n&apos;a été enregistré. Si un montant a été débité, il sera pris en compte automatiquement.</p>
            <Link href={`/give/${don.organisation.slug}#don`} className="inline-block mt-5 bg-secondary text-white font-bold px-6 py-3 rounded-xl">Réessayer</Link>
          </div>
        )}

        <dl className="mt-6 rounded-2xl bg-light p-4 text-sm space-y-1.5">
          <div className="flex justify-between gap-3"><dt className="text-gray-600">Référence</dt><dd className="font-mono text-dark">{don.reference}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600">Don</dt><dd className="text-dark">{formatPrice(don.montant)}</dd></div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Frais de paiement</dt>
            <dd className="text-dark">{formatPrice(don.frais)} {don.couvre_frais ? "(ajoutés)" : "(déduits)"}</dd>
          </div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600">Montant débité</dt><dd className="font-bold text-dark">{formatPrice(don.total)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600">Reversé à l&apos;ONG</dt><dd className="font-bold text-primary">{formatPrice(don.montant_ong)}</dd></div>
        </dl>

        {don.statut === "paye" && don.date_reversement && (
          <p className="flex gap-2 mt-4 text-sm text-gray-600">
            <CalendarClock size={16} className="text-primary flex-shrink-0 mt-0.5" />
            Reversement à l&apos;ONG au plus tard le {formatDate(don.date_reversement, { day: "numeric", month: "long", year: "numeric" })} : nous vous préviendrons par email.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm font-bold">
          <Link href="/profil/dons" className="flex items-center gap-1.5 text-primary hover:underline"><CheckCircle size={15} /> Mes dons</Link>
          <Link href="/give" className="text-primary hover:underline">Découvrir d&apos;autres ONG</Link>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <RetourDon />
    </Suspense>
  );
}
