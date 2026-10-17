"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, CheckCircle2, ChevronDown, FileText, MapPin, Phone, Search, XCircle } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { cn, formatDate, formatPrice, libelleType } from "@/lib/utils";
import PiecesAControler, { ouvrirPiece } from "@/components/agent/PiecesAControler";

interface Visite {
  id: string;
  name: string;
  type: string;
  city: string;
  location: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  photos: string[];
  modifiee_apres_verification: boolean;
  cree_le: string;
  hote: {
    id: string;
    nom: string;
    email: string;
    telephone: string | null;
    piece: { statut: "absente" | "soumise" | "verifiee" | "refusee"; type_libelle?: string; motif_refus?: string };
  };
}

interface ReponseVisites {
  results: Visite[];
  count: number;
  controles: Record<string, string>;
  max_photos: number;
}

const PIECE: Record<Visite["hote"]["piece"]["statut"], { libelle: string; classe: string }> = {
  absente: { libelle: "Pièce d'identité pas encore envoyée", classe: "bg-red-50 text-red-700" },
  soumise: { libelle: "Pièce d'identité à contrôler", classe: "bg-amber-50 text-amber-800" },
  verifiee: { libelle: "Identité déjà vérifiée", classe: "bg-green-50 text-green-700" },
  refusee: { libelle: "Pièce d'identité refusée, à renvoyer", classe: "bg-red-50 text-red-700" },
};

function FicheVisite({ visite, controlesLibelles, maxPhotos, onTerminee }: {
  visite: Visite;
  controlesLibelles: Record<string, string>;
  maxPhotos: number;
  onTerminee: () => void;
}) {
  const [controles, setControles] = useState<Record<string, boolean>>({});
  const [commentaire, setCommentaire] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState<"validee" | "refusee" | null>(null);

  const toutCoche = Object.keys(controlesLibelles).every((cle) => controles[cle]);
  const piece = PIECE[visite.hote.piece.statut];
  const telephone = visite.hote.telephone?.replace(/[^\d+]/g, "");
  const carte = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${visite.location}, ${visite.city}`)}`;

  const decider = async (decision: "validee" | "refusee") => {
    if (decision === "refusee" && commentaire.trim().length < 10) {
      toast.error("Expliquez à l'hôte le motif du refus (10 caractères au moins).");
      return;
    }
    if (decision === "validee" && !window.confirm(`Publier « ${visite.name} » ?`)) return;
    setEnvoi(decision);
    const donnees = new FormData();
    donnees.append("decision", decision);
    donnees.append("controles", JSON.stringify(controles));
    donnees.append("commentaire", commentaire);
    photos.forEach((photo) => donnees.append("photos", photo));
    try {
      await api.post(`/v1/verifications/visites/${visite.id}/decision/`, donnees, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(decision === "validee" ? "Annonce publiée, l'hôte est prévenu." : "Refus envoyé à l'hôte.");
      onTerminee();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setEnvoi(null);
    }
  };

  return (
    <div className="border-t border-gray-100 p-4 sm:p-5 space-y-5">
      {/* Hôte */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Hôte</h3>
        <p className="font-semibold text-dark">{visite.hote.nom} <span className="font-normal text-gray-500">· {visite.hote.email}</span></p>
        <div className="flex flex-wrap gap-2">
          {telephone && (
            <>
              <a href={`tel:${telephone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-sm font-semibold text-dark"><Phone size={15} /> {visite.hote.telephone}</a>
              <a href={`https://wa.me/${telephone.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-green-50 text-sm font-semibold text-green-700">WhatsApp</a>
            </>
          )}
          <a href={carte} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-sm font-semibold text-dark"><MapPin size={15} /> Itinéraire</a>
        </div>
        <div className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm", piece.classe)}>
          <span>{piece.libelle}{visite.hote.piece.type_libelle ? ` (${visite.hote.piece.type_libelle})` : ""}</span>
          {visite.hote.piece.statut === "soumise" && (
            <button onClick={() => ouvrirPiece(visite.hote.id)} className="flex items-center gap-1 font-bold underline"><FileText size={15} /> Voir</button>
          )}
        </div>
      </section>

      {/* Annonce */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Annonce à comparer au logement</h3>
        <p className="text-sm text-dark">{libelleType(visite.type, "fr")} · {visite.max_guests} voyageurs · {formatPrice(visite.price_per_night)} / nuit</p>
        <p className="text-sm text-gray-600">{visite.location ? `${visite.location}, ` : ""}{visite.city}</p>
        {visite.amenities.length > 0 && <p className="text-sm text-gray-600">Équipements annoncés : {visite.amenities.join(", ")}</p>}
        {visite.description && <p className="text-sm text-gray-600 whitespace-pre-line">{visite.description}</p>}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visite.photos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <img src={url} alt="" className="w-28 h-20 object-cover rounded-lg" />
            </a>
          ))}
        </div>
      </section>

      {/* Grille de contrôle */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Contrôles sur place</h3>
        {Object.entries(controlesLibelles).map(([cle, libelle]) => (
          <label key={cle} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-3 text-sm text-dark">
            <input type="checkbox" checked={!!controles[cle]} onChange={(e) => setControles((c) => ({ ...c, [cle]: e.target.checked }))} className="mt-0.5 w-5 h-5 accent-primary flex-shrink-0" />
            {libelle}
          </label>
        ))}
      </section>

      <section className="space-y-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Photos prises sur place (facultatif, {maxPhotos} au plus)</span>
          <span className="mt-2 flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600">
            <Camera size={18} /> {photos.length ? `${photos.length} photo(s) sélectionnée(s)` : "Prendre ou choisir des photos"}
          </span>
          <input type="file" accept="image/*" capture="environment" multiple className="sr-only"
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, maxPhotos))} />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Commentaire (obligatoire en cas de refus : il est envoyé à l&apos;hôte)</span>
          <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} maxLength={2000}
            className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Ex. : la piscine annoncée n'existe pas ; les photos montrent un autre logement…" />
        </label>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => decider("refusee")} disabled={!!envoi} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-700 font-bold disabled:opacity-50">
          <XCircle size={18} /> {envoi === "refusee" ? "Envoi…" : "Refuser"}
        </button>
        <button onClick={() => decider("validee")} disabled={!!envoi || !toutCoche || visite.hote.piece.statut === "absente" || visite.hote.piece.statut === "refusee"}
          title={toutCoche ? undefined : "Cochez tous les contrôles pour valider"}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-40">
          <CheckCircle2 size={18} /> {envoi === "validee" ? "Envoi…" : "Valider et publier"}
        </button>
      </div>
    </div>
  );
}

/** Espace des agents de terrain : logements à visiter avant leur publication. */
export default function VisitesPage() {
  const queryClient = useQueryClient();
  const [ville, setVille] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["verification", "visites", ville],
    queryFn: async () => (await api.get<ReponseVisites>("/v1/verifications/visites/", { params: ville ? { ville } : {} })).data,
  });

  const terminee = async () => {
    setOuverte(null);
    await queryClient.invalidateQueries({ queryKey: ["verification", "visites"] });
  };

  return (
    <div>
      <PiecesAControler />

      <h1 className="font-heading font-bold text-2xl text-dark">Logements à visiter</h1>
      <p className="text-sm text-gray-500 mt-1">Une annonce n&apos;est publiée qu&apos;après votre visite. Seuls les hôtes dont l&apos;identité est vérifiée apparaissent ici. Les plus anciennes d&apos;abord.</p>

      <label className="relative block mt-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Filtrer par ville"
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
      </label>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          [0, 1].map((i) => <div key={i} className="h-24 skeleton rounded-2xl" />)
        ) : isError ? (
          <p className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">Accès réservé aux agents de vérification.</p>
        ) : !data?.results.length ? (
          <p className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-100">Aucun logement à visiter pour le moment.</p>
        ) : (
          data.results.map((v) => (
            <article key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setOuverte(ouverte === v.id ? null : v.id)} aria-expanded={ouverte === v.id}
                className="w-full flex items-center gap-3 p-4 text-left">
                <img src={v.photos[0] ?? ""} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-heading font-bold text-dark truncate">{v.name}</span>
                  <span className="block text-sm text-gray-500 truncate">{v.city}{v.location ? ` · ${v.location}` : ""}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {v.modifiee_apres_verification ? "Modifiée après vérification" : "Nouvelle annonce"} · {formatDate(v.cree_le)}
                  </span>
                </span>
                <ChevronDown size={20} className={cn("text-gray-400 transition-transform flex-shrink-0", ouverte === v.id && "rotate-180")} />
              </button>
              {ouverte === v.id && (
                <FicheVisite visite={v} controlesLibelles={data.controles} maxPhotos={data.max_photos} onTerminee={terminee} />
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
