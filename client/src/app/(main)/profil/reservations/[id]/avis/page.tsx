"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import api, { firstErrorMessage } from "@/lib/api";
import { cn, FALLBACK_IMAGE, formatDate } from "@/lib/utils";
import SubPageHeader from "@/components/layout/SubPageHeader";
import type { CritereAvis, Reservation } from "@/types/api/models";

const LIBELLES_NOTE = ["", "Très décevant", "Décevant", "Correct", "Très bien", "Exceptionnel"];

const CRITERES: { id: CritereAvis; label: string; aide: string }[] = [
  { id: "proprete", label: "Propreté", aide: "Le logement était-il propre à votre arrivée ?" },
  { id: "conformite", label: "Conforme aux photos", aide: "Le logement correspondait-il à l'annonce et aux photos ?" },
  { id: "communication", label: "Communication", aide: "L'hôte était-il joignable et réactif ?" },
  { id: "emplacement", label: "Emplacement", aide: "Le quartier et l'accès correspondaient-ils à vos attentes ?" },
  { id: "qualite_prix", label: "Rapport qualité/prix", aide: "Le prix était-il justifié ?" },
];

function StarInput({ value, onChange, size = 28, label }: { value: number; onChange: (n: number) => void; size?: number; label: string }) {
  const [survol, setSurvol] = useState(0);
  const affiche = survol || value;
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={() => setSurvol(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sur 5 — ${LIBELLES_NOTE[n]}`}
          onClick={() => onChange(n)} onMouseEnter={() => setSurvol(n)}
          className="p-0.5 transition-transform active:scale-90"
        >
          <Star size={size} className={n <= affiche ? "fill-accent text-accent" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );
}

export default function LaisserAvisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [note, setNote] = useState(0);
  const [criteres, setCriteres] = useState<Record<CritereAvis, number>>({ proprete: 0, conformite: 0, communication: 0, emplacement: 0, qualite_prix: 0 });
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const { data: reservation, isLoading, isError } = useQuery({
    queryKey: ["reservation", id],
    queryFn: async () => (await api.get<Reservation>(`/v1/reservations/${id}/`)).data,
    retry: false,
  });

  if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-10"><div className="h-96 skeleton rounded-3xl" /></div>;

  if (isError || !reservation) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="font-heading font-bold text-xl text-dark">Séjour introuvable</p>
        <Link href="/profil/reservations" className="text-primary font-bold hover:underline">Mes réservations</Link>
      </div>
    );
  }

  const h = reservation.hebergement_detail;
  const complet = note > 0 && Object.values(criteres).every((v) => v > 0) && commentaire.trim().length >= 20;

  if (!reservation.peut_evaluer) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <SubPageHeader title="Laisser un avis" back="/profil/reservations" />
        <div className="bg-white rounded-3xl p-8 text-center text-gray-600">
          {reservation.avis_id
            ? <>Vous avez déjà évalué ce séjour. <Link href={`/hebergements/${h.id}#avis`} className="text-primary font-bold hover:underline">Voir les avis</Link></>
            : "Ce séjour ne peut pas (ou plus) être évalué : l'avis est possible après le départ, dans les 60 jours."}
        </div>
      </div>
    );
  }

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complet || envoi) return;
    setEnvoi(true);
    setErreur("");
    try {
      await api.post("/v1/avis/", { reservation: reservation.id, note, ...criteres, commentaire: commentaire.trim() });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["avis"] });
      queryClient.invalidateQueries({ queryKey: ["avis-a-laisser"] });
      toast.success("Merci ! Votre avis est publié.");
      router.push(`/hebergements/${h.id}#avis`);
    } catch (err) {
      const data = (err as { response?: { data?: unknown } }).response?.data;
      setErreur(firstErrorMessage(data) ?? "Publication impossible. Réessayez.");
      setEnvoi(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <SubPageHeader title="Laisser un avis" subtitle="Votre retour aide les autres voyageurs et l'hôte." back="/profil/reservations" />

      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 items-center mb-6">
        <img src={h.image_url || FALLBACK_IMAGE} alt="" className="w-20 h-16 rounded-xl object-cover flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-heading font-bold text-dark truncate">{h.name}</p>
          <p className="text-sm text-muted">{h.city} · {formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}</p>
        </div>
      </div>

      <form onSubmit={envoyer} className="bg-white rounded-3xl shadow-card p-5 sm:p-8 space-y-8">
        <div className="text-center">
          <p className="font-heading font-bold text-dark text-lg mb-3">Votre note globale</p>
          <div className="flex justify-center"><StarInput value={note} onChange={setNote} size={38} label="Note globale" /></div>
          <p className="text-sm font-semibold text-primary mt-2 h-5">{LIBELLES_NOTE[note]}</p>
        </div>

        <div className="space-y-5">
          {CRITERES.map((c) => (
            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-semibold text-dark text-sm">{c.label}</p>
                <p className="text-xs text-muted">{c.aide}</p>
              </div>
              <StarInput value={criteres[c.id]} onChange={(n) => setCriteres((p) => ({ ...p, [c.id]: n }))} size={24} label={c.label} />
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="commentaire" className="block font-semibold text-dark text-sm mb-2">Racontez votre séjour</label>
          <textarea
            id="commentaire" value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            rows={6} maxLength={2000}
            placeholder="Ce que vous avez aimé, ce qui pourrait être amélioré, conseils pour les futurs voyageurs…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
          />
          <p className={cn("text-xs mt-1 text-right", commentaire.trim().length < 20 ? "text-muted" : "text-secondary")}>
            {commentaire.trim().length < 20 ? `Encore ${20 - commentaire.trim().length} caractères minimum` : `${commentaire.length}/2000`}
          </p>
        </div>

        <p className="text-xs text-muted bg-gray-50 rounded-xl p-3">
          Votre avis sera public, signé de votre prénom et de l&apos;initiale de votre nom. L&apos;hôte pourra y répondre.
        </p>

        {erreur && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erreur}</p>}

        <button type="submit" disabled={!complet || envoi} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-button disabled:opacity-50 disabled:shadow-none">
          {envoi ? "Publication..." : complet ? "Publier mon avis" : "Notez chaque critère pour publier"}
        </button>
      </form>
    </div>
  );
}
