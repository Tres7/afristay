"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileText, Mail, Phone, XCircle } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface PieceAControler {
  hote: { id: string; nom: string; email: string; telephone: string | null; inscrit_le: string };
  type_libelle: string;
  soumise_le: string;
  nb_annonces: number;
}

/** Ouvre la pièce d'identité : lue avec le jeton de l'agent (jamais d'URL publique), affichée dans un nouvel onglet. */
export async function ouvrirPiece(hoteId: string) {
  const onglet = window.open("", "_blank");
  try {
    const res = await api.get<Blob>(`/v1/verifications/identite/${hoteId}/fichier/`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    if (onglet) onglet.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    onglet?.close();
    toast.error(apiErrorMessage(err, "Document introuvable."));
  }
}

function Piece({ piece, onTerminee }: { piece: PieceAControler; onTerminee: () => void }) {
  const [refus, setRefus] = useState(false);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const decider = async (decision: "verifiee" | "refusee") => {
    if (decision === "refusee" && motif.trim().length < 10) {
      toast.error("Expliquez à l'hôte le motif du refus (10 caractères au moins).");
      return;
    }
    setEnvoi(true);
    try {
      await api.post(`/v1/verifications/identites/${piece.hote.id}/decision/`, { decision, motif });
      toast.success(decision === "verifiee"
        ? "Identité vérifiée : ses logements passent dans les visites à faire."
        : "Refus envoyé à l'hôte, le document est supprimé.");
      onTerminee();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setEnvoi(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-bold text-dark">{piece.hote.nom || piece.hote.email}</p>
          <p className="text-sm text-gray-500">{piece.type_libelle} · envoyée le {formatDate(piece.soumise_le)}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Mail size={12} /> {piece.hote.email}</span>
            {piece.hote.telephone && <a href={`tel:${piece.hote.telephone}`} className="flex items-center gap-1 text-primary"><Phone size={12} /> {piece.hote.telephone}</a>}
            <span>{piece.nb_annonces} annonce{piece.nb_annonces > 1 ? "s" : ""} · inscrit le {formatDate(piece.hote.inscrit_le)}</span>
          </p>
        </div>
        <button type="button" onClick={() => ouvrirPiece(piece.hote.id)}
          className="flex items-center gap-2 text-sm font-bold text-primary border border-primary/30 rounded-xl px-4 py-2 hover:bg-primary/5">
          <FileText size={16} /> Voir le document
        </button>
      </div>

      {refus ? (
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold text-dark uppercase tracking-wide" htmlFor={`motif-${piece.hote.id}`}>Motif (envoyé à l&apos;hôte)</label>
          <textarea id={`motif-${piece.hote.id}`} value={motif} onChange={(e) => setMotif(e.target.value)} rows={2}
            placeholder="Ex : photo floue, nom illisible, document expiré"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setRefus(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600">Annuler</button>
            <button type="button" disabled={envoi} onClick={() => decider("refusee")}
              className="flex items-center gap-2 bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-60">
              <XCircle size={16} /> Refuser
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button type="button" disabled={envoi} onClick={() => setRefus(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60">
            Refuser
          </button>
          <button type="button" disabled={envoi} onClick={() => decider("verifiee")}
            className="flex items-center gap-2 bg-secondary text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-60">
            <CheckCircle2 size={16} /> Identité conforme
          </button>
        </div>
      )}
    </article>
  );
}

/** Pièces d'identité envoyées par les hôtes, contrôlées à distance avant toute visite. */
export default function PiecesAControler() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["verification", "identites"],
    queryFn: async () => (await api.get<{ results: PieceAControler[]; count: number }>("/v1/verifications/identites/")).data,
  });

  if (!data?.count) return null;

  const terminee = () => {
    queryClient.invalidateQueries({ queryKey: ["verification"] });
  };

  return (
    <section className="mb-10">
      <h1 className="font-heading font-bold text-2xl text-dark">Pièces d&apos;identité à contrôler <span className="text-gray-400">({data.count})</span></h1>
      <p className="text-sm text-gray-500 mt-1">
        Vérifiez que le document est lisible, valide et au nom de l&apos;hôte. Ses logements ne vous seront proposés pour une visite
        qu&apos;une fois son identité vérifiée. Le document est supprimé après votre décision.
      </p>
      <div className="mt-5 space-y-3">
        {data.results.map((p) => <Piece key={p.hote.id} piece={p} onTerminee={terminee} />)}
      </div>
    </section>
  );
}
