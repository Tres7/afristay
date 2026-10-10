"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Users } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ApercuInvitation } from "@/types/api/voyage";

export default function RejoindrePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const { data: v, isError, error } = useQuery({
    queryKey: ["invitation", code],
    queryFn: async () => (await api.get<ApercuInvitation>(`/v1/voyages/invitations/${code}/`)).data,
    retry: false,
  });

  const rejoindre = async () => {
    setEnvoi(true);
    try {
      const res = await api.post<{ id: string }>(`/v1/voyages/invitations/${code}/`);
      queryClient.invalidateQueries({ queryKey: ["voyages"] });
      router.push(`/together/${res.data.id}`);
    } catch (err) {
      setErreur(apiErrorMessage(err, "Impossible de rejoindre ce voyage."));
      setEnvoi(false);
    }
  };

  return (
    <div className="bg-light min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-card border border-gray-100 p-6 sm:p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Users size={26} /></div>
        {isError ? (
          <>
            <h1 className="font-heading font-bold text-dark text-xl mt-4">Invitation introuvable</h1>
            <p className="text-sm text-gray-600 mt-2">{apiErrorMessage(error, "Ce lien n'est plus valable.")} Demandez un nouveau lien à la personne qui organise.</p>
            <Link href="/together" className="inline-block mt-6 text-primary font-bold hover:underline">Découvrir Kwa-Ba Together</Link>
          </>
        ) : !v ? (
          <div className="h-40 skeleton rounded-2xl mt-4" />
        ) : (
          <>
            <p className="text-sm text-gray-600 mt-4">{v.organisateur} vous invite à préparer</p>
            <h1 className="font-heading font-bold text-dark text-2xl mt-1">{v.nom}</h1>
            <p className="flex items-center justify-center gap-1.5 text-sm text-gray-600 mt-2">
              <MapPin size={14} className="text-primary" /> {v.destination}
              {v.date_debut && v.date_fin && <> · {formatDate(v.date_debut)} → {formatDate(v.date_fin)}</>}
            </p>
            <p className="text-sm text-gray-600 mt-1">{v.nb_membres} membre{v.nb_membres > 1 ? "s" : ""} pour l&apos;instant</p>
            {erreur && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mt-4">{erreur}</p>}
            {v.deja_membre ? (
              <Link href={`/together/${v.id}`} className="block w-full mt-6 bg-primary text-white font-bold py-3.5 rounded-2xl">Ouvrir le voyage</Link>
            ) : (
              <button onClick={rejoindre} disabled={envoi} className="w-full mt-6 bg-primary text-white font-bold py-3.5 rounded-2xl disabled:opacity-60">
                {envoi ? "Un instant…" : "Rejoindre le voyage"}
              </button>
            )}
            <p className="text-xs text-gray-600 mt-4">Les autres membres verront votre prénom et l&apos;initiale de votre nom.</p>
          </>
        )}
      </div>
    </div>
  );
}
