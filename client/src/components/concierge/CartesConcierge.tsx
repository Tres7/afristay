"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, MapPin, Star, Users } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { FALLBACK_IMAGE, formatDate, formatPrice } from "@/lib/utils";
import type { Carte, CarteLogement, CarteTogether, CarteTransfert } from "@/types/api/concierge";

function Logement({ c }: { c: CarteLogement }) {
  const sejour = c.arrivee && c.depart ? `?check_in=${c.arrivee}&check_out=${c.depart}&guests=${c.voyageurs ?? 1}` : "";
  return (
    <article className="w-60 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <img src={c.image || FALLBACK_IMAGE} alt={c.nom} className="w-full h-32 object-cover" />
      <div className="p-3">
        <p className="font-bold text-sm text-dark truncate">{c.nom}</p>
        <p className="flex items-center gap-1 text-xs text-gray-600 truncate"><MapPin size={11} className="text-primary flex-shrink-0" /> {c.quartier || c.ville}</p>
        <p className="flex items-center gap-2 text-xs text-gray-600 mt-1">
          {c.nb_avis > 0 && <span className="flex items-center gap-0.5"><Star size={11} className="fill-accent text-accent" /> {c.note.toFixed(1)}</span>}
          <span className="flex items-center gap-0.5"><Users size={11} /> {c.capacite}</span>
        </p>
        <p className="text-sm text-dark mt-2"><strong>{formatPrice(c.prix_nuit)}</strong> <span className="text-xs text-gray-600">/ nuit</span></p>
        {c.total !== null && <p className="text-xs text-gray-600">{formatPrice(c.total)} pour {c.nuits} nuit{(c.nuits ?? 0) > 1 ? "s" : ""}, frais compris</p>}
        <div className="flex gap-2 mt-3">
          <Link href={`/hebergements/${c.id}${sejour}`} className="flex-1 text-center px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-dark hover:bg-gray-50">Voir</Link>
          {sejour && <Link href={`/reservation/${c.id}${sejour}`} className="flex-1 text-center px-3 py-2 rounded-xl bg-secondary text-white text-xs font-bold">Réserver</Link>}
        </div>
      </div>
    </article>
  );
}

function Transfert({ c }: { c: CarteTransfert }) {
  const [jour, heure] = c.arrivee.split("T");
  const lien = `/transfert?aeroport=${c.aeroport}&date=${jour}&heure=${heure}&passagers=${c.passagers}&bagages=${c.bagages}`;
  return (
    <article className="w-72 flex-shrink-0 bg-dark text-white rounded-2xl p-4">
      <p className="flex items-center gap-2 font-bold text-sm"><Car size={16} /> Transfert depuis l&apos;aéroport de {c.ville}</p>
      <p className="text-xs text-white/75 mt-1">{formatDate(jour)} à {heure.replace(":", " h ")} · {c.passagers} passager{c.passagers > 1 ? "s" : ""}, {c.bagages} bagage{c.bagages > 1 ? "s" : ""}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {c.options.filter((o) => o.disponible).map((o) => (
          <li key={o.categorie} className="flex justify-between gap-3"><span>{o.nom}</span><strong>{formatPrice(o.prix)}</strong></li>
        ))}
      </ul>
      {c.trop_tard ? (
        <p className="text-xs text-orange-200 mt-3">Trop tard pour réserver (moins de 6 h avant l&apos;arrivée).</p>
      ) : (
        <Link href={lien} className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-white text-dark text-xs font-bold">
          Réserver ce transfert
        </Link>
      )}
    </article>
  );
}

function Together({ c }: { c: CarteTogether }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const creer = async () => {
    setEnvoi(true);
    try {
      const v = await api.post<{ id: string }>("/v1/voyages/", {
        nom: c.nom, destination: c.destination, date_debut: c.arrivee, date_fin: c.depart, nb_voyageurs: c.voyageurs,
      });
      await Promise.allSettled(c.logements.map((l) => api.post(`/v1/voyages/${v.data.id}/propositions/`, { hebergement: l.id })));
      router.push(`/together/${v.data.id}?nouveau=1`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Le voyage n'a pas pu être créé."));
      setEnvoi(false);
    }
  };
  return (
    <article className="w-72 flex-shrink-0 bg-primary/5 border border-primary/20 rounded-2xl p-4">
      <p className="flex items-center gap-2 font-bold text-sm text-dark"><Users size={16} className="text-primary" /> Voyage de groupe : {c.nom}</p>
      <p className="text-xs text-gray-600 mt-1">
        {c.destination} · {c.voyageurs} voyageur{c.voyageurs > 1 ? "s" : ""}
        {c.arrivee && c.depart && <> · {formatDate(c.arrivee)} → {formatDate(c.depart)}</>}
      </p>
      {c.logements.length > 0 && <p className="text-xs text-dark mt-2">À voter : {c.logements.map((l) => l.nom).join(", ")}</p>}
      <button onClick={creer} disabled={envoi} className="mt-3 w-full py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-60">
        {envoi ? "Création…" : "Créer ce voyage et inviter mes proches"}
      </button>
    </article>
  );
}

export default function CartesConcierge({ cartes }: { cartes: Carte[] }) {
  if (!cartes.length) return null;
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1" aria-label="Offres AfriStay proposées">
      {cartes.map((c, i) =>
        c.type === "logement" ? <Logement key={`${c.id}-${i}`} c={c} />
          : c.type === "transfert" ? <Transfert key={`t-${i}`} c={c} />
            : <Together key={`g-${i}`} c={c} />,
      )}
    </div>
  );
}
