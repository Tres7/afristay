"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { FALLBACK_IMAGE, formatDate, formatPrice, TYPE_LABELS } from "@/lib/utils";
import { PAGE_SIZE, useAdminList, useDebounced } from "@/lib/useAdminList";
import AdminTable, { ActionButton, Pagination, Pill, SearchInput, type Colonne } from "@/components/backoffice/AdminTable";
import ConfirmDialog, { type Confirmation } from "@/components/backoffice/ConfirmDialog";
import RatingBadge from "@/components/avis/RatingBadge";
import Select from "@/components/ui/Select";
import type { AdminHebergement } from "@/types/api/admin";

const VISIBILITE = [
  { value: "", label: "Toutes" },
  { value: "true", label: "Visibles" },
  { value: "false", label: "Masquées" },
];
const VERIFICATION = [
  { value: "", label: "Toutes" },
  { value: "true", label: "Vérifiées" },
  { value: "false", label: "À vérifier" },
];

function Annonces() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [visible, setVisible] = useState(searchParams.get("visible") ?? "");
  const [verifie, setVerifie] = useState(searchParams.get("verifie") ?? "");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const recherche = useDebounced(q);

  const { data, isLoading, isFetching, isError, refetch, page, setPage } = useAdminList<AdminHebergement>("hebergements", { q: recherche, visible, verifie });

  const executer = async (requete: Promise<unknown>, succes: string) => {
    try {
      await requete;
      toast.success(succes);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  };

  const colonnes: Colonne<AdminHebergement>[] = [
    {
      titre: "Annonce", masquerMobile: true,
      cellule: (h) => (
        <div className="flex items-center gap-3 min-w-0">
          <img src={h.image_url || FALLBACK_IMAGE} alt="" className="w-14 h-11 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-dark truncate flex items-center gap-1">
              {h.name} {h.est_verifie && <BadgeCheck size={14} className="text-secondary flex-shrink-0" aria-label="Logement vérifié" />}
            </p>
            <p className="text-xs text-muted truncate">{TYPE_LABELS[h.type] ?? h.type} · {h.city}</p>
          </div>
        </div>
      ),
    },
    { titre: "Hôte", cellule: (h) => <div className="text-xs min-w-0"><p className="text-dark font-medium truncate">{h.host.nom}</p><p className="text-muted truncate">{h.host.email}</p></div> },
    { titre: "Prix / nuit", cellule: (h) => <span className="whitespace-nowrap tabular-nums">{formatPrice(h.price_per_night)}</span> },
    { titre: "Note", cellule: (h) => <RatingBadge rating={h.rating} count={h.review_count} variant="full" className="whitespace-nowrap" /> },
    { titre: "Statut", cellule: (h) => <Pill ton={h.is_available ? "vert" : "gris"}>{h.is_available ? "Visible" : "Masquée"}</Pill> },
    { titre: "Créée le", className: "hidden 2xl:table-cell", cellule: (h) => <span className="text-xs text-gray-600 whitespace-nowrap">{formatDate(h.created_at)}</span> },
  ];

  const actions = (h: AdminHebergement) => (
    <>
      <Link href={`/hebergements/${h.id}`} target="_blank" className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-dark hover:bg-gray-50 flex items-center gap-1">
        Voir <ExternalLink size={12} />
      </Link>
      <ActionButton onClick={() => setConfirmation({
        titre: h.est_verifie ? "Retirer le badge « vérifié »" : "Marquer comme vérifiée",
        message: h.est_verifie
          ? <>Le badge « Logement vérifié » ne s&apos;affichera plus sur <strong>{h.name}</strong>.</>
          : <>Confirmez qu&apos;une visite a validé <strong>{h.name}</strong> (photos, adresse, équipements). Le badge « Logement vérifié » sera affiché aux voyageurs.</>,
        libelle: h.est_verifie ? "Retirer le badge" : "Marquer vérifiée",
        action: () => executer(api.patch(`/v1/admin/hebergements/${h.id}/`, { est_verifie: !h.est_verifie }), h.est_verifie ? "Badge retiré" : "Annonce vérifiée"),
      })}>{h.est_verifie ? "Retirer badge" : "Vérifier"}</ActionButton>
      <ActionButton onClick={() => setConfirmation({
        titre: h.is_available ? "Masquer l'annonce" : "Republier l'annonce",
        message: h.is_available
          ? <><strong>{h.name}</strong> n&apos;apparaîtra plus dans les recherches. Les réservations existantes sont conservées.</>
          : <><strong>{h.name}</strong> sera de nouveau visible par les voyageurs.</>,
        libelle: h.is_available ? "Masquer" : "Republier",
        action: () => executer(api.patch(`/v1/admin/hebergements/${h.id}/`, { is_available: !h.is_available }), h.is_available ? "Annonce masquée" : "Annonce republiée"),
      })}>{h.is_available ? "Masquer" : "Republier"}</ActionButton>
      <ActionButton danger onClick={() => setConfirmation({
        titre: "Supprimer définitivement",
        message: <>Supprimer <strong>{h.name}</strong> ? Ses {h.nb_reservations} réservation(s), avis et conversations seront aussi supprimés. Action irréversible.</>,
        libelle: "Supprimer", danger: true, motif: true,
        action: (motif) => executer(api.delete(`/v1/admin/hebergements/${h.id}/`, { params: { motif } }), "Annonce supprimée"),
      })}>Supprimer</ActionButton>
    </>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-dark">Annonces</h1>
        <p className="text-muted text-sm mt-1">{data ? `${data.count} annonce${data.count > 1 ? "s" : ""}` : "…"}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Nom, ville, quartier ou email de l'hôte" />
        <Select label="Visibilité" value={visible} onChange={setVisible} options={VISIBILITE} className="sm:w-44" icon={<span className="text-xs text-muted flex-shrink-0">Visibilité</span>} />
        <Select label="Vérification" value={verifie} onChange={setVerifie} options={VERIFICATION} className="sm:w-48" icon={<span className="text-xs text-muted flex-shrink-0">Vérification</span>} />
      </div>

      <AdminTable
        colonnes={colonnes} lignes={data?.results} cle={(h) => h.id} actions={actions}
        titreMobile={(h) => colonnes[0].cellule(h)}
        chargement={isLoading || isFetching} erreur={isError} onReessayer={refetch}
      />
      {data && <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} onChange={setPage} />}
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}

export default function AnnoncesPage() {
  return <Suspense><Annonces /></Suspense>;
}
