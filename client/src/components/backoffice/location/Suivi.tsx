"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/utils";
import { PAGE_SIZE, useAdminList, useDebounced } from "@/lib/useAdminList";
import AdminTable, { ActionButton, Pagination, Pill, SearchInput, type Colonne } from "@/components/backoffice/AdminTable";
import ConfirmDialog, { type Confirmation } from "@/components/backoffice/ConfirmDialog";
import BoutonFacture from "@/components/backoffice/documents/BoutonFacture";
import Panneau, { Champ, Liste, Saisie, erreursApi } from "@/components/backoffice/Panneau";
import Select from "@/components/ui/Select";
import type { AdminLocation } from "@/types/api/admin";

const STATUTS = [
  { value: "", label: "Tous les statuts" },
  { value: "confirmee", label: "Payées, loueur à attribuer" },
  { value: "partenaire_assigne", label: "Loueur attribué" },
  { value: "en_attente_paiement", label: "En attente de paiement" },
  { value: "terminee", label: "Terminées" },
  { value: "annulee", label: "Annulées" },
];
const TON: Record<AdminLocation["statut"], "vert" | "orange" | "gris" | "rouge" | "bleu"> = {
  confirmee: "orange", partenaire_assigne: "vert", en_attente_paiement: "gris", terminee: "bleu", annulee: "rouge",
};
const dateHeure = (d: string) => formatDate(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Suivi() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("confirmee");
  const recherche = useDebounced(q);
  const { data, isLoading, isFetching, isError, refetch, page, setPage } = useAdminList<AdminLocation>("location/locations", { q: recherche, statut });
  const [attribution, setAttribution] = useState<AdminLocation | null>(null);
  const [form, setForm] = useState({ partenaire: "", vehicule: "", immatriculation: "", chauffeur_nom: "", chauffeur_telephone: "" });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const { data: loueurs = [] } = useQuery({
    queryKey: ["admin", "location", "loueurs-dispo", attribution?.id],
    queryFn: async () => (await api.get<{ id: number; nom: string; telephone: string }[]>(`/v1/admin/location/locations/${attribution!.id}/loueurs/`)).data,
    enabled: !!attribution,
  });

  const ouvrir = (l: AdminLocation) => {
    setAttribution(l);
    setForm({ partenaire: l.partenaire ? String(l.partenaire.id) : "", vehicule: l.vehicule, immatriculation: l.immatriculation,
      chauffeur_nom: l.chauffeur_nom, chauffeur_telephone: l.chauffeur_telephone });
    setErreurs({});
  };

  const attribuer = async () => {
    if (!attribution) return;
    setEnvoi(true);
    try {
      await api.post(`/v1/admin/location/locations/${attribution.id}/attribuer/`, { ...form, partenaire: Number(form.partenaire) });
      toast.success("Loueur attribué : le voyageur reçoit ses coordonnées");
      setAttribution(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err) {
      setErreurs(erreursApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  const colonnes: Colonne<AdminLocation>[] = [
    { titre: "Location", masquerMobile: true, cellule: (l) => (
      <div className="min-w-0"><p className="font-semibold text-dark">{l.categorie} · {l.formule_libelle}</p><p className="text-xs text-muted font-mono">{l.reference}</p></div>
    ) },
    { titre: "Voyageur", cellule: (l) => <div className="text-xs"><p className="text-dark font-medium">{l.voyageur.nom}</p><p className="text-muted">{l.telephone}</p></div> },
    { titre: "Prise", cellule: (l) => <div className="text-xs"><p className="text-dark">{dateHeure(l.debut)}</p><p className="text-muted">{l.lieu_prise} · {l.jours} j</p></div> },
    { titre: "Montant", cellule: (l) => <span className="tabular-nums whitespace-nowrap">{formatPrice(l.prix)}</span> },
    { titre: "Statut", cellule: (l) => <div className="flex flex-col items-start gap-1"><Pill ton={TON[l.statut]}>{l.statut_libelle}</Pill>
      {l.partenaire && <span className="text-xs text-muted">{l.partenaire.nom}</span>}</div> },
  ];

  const actions = (l: AdminLocation) => (
    <>
      {["confirmee", "partenaire_assigne", "terminee"].includes(l.statut) && <BoutonFacture objet="location" id={l.id} />}
      {(l.statut === "confirmee" || l.statut === "partenaire_assigne") && (
        <ActionButton onClick={() => ouvrir(l)}>{l.partenaire ? "Modifier le loueur" : "Attribuer"}</ActionButton>
      )}
      {(l.statut === "confirmee" || l.statut === "partenaire_assigne" || l.statut === "en_attente_paiement") && (
        <ActionButton danger onClick={() => setConfirmation({
          titre: "Annuler la location", danger: true, motif: true, libelle: "Annuler et rembourser",
          message: <>La location <strong>{l.reference}</strong> sera annulée et le voyageur remboursé intégralement s&apos;il a payé.</>,
          action: async (motif) => {
            try {
              await api.post(`/v1/admin/location/locations/${l.id}/annuler/`, { motif });
              toast.success("Location annulée");
              queryClient.invalidateQueries({ queryKey: ["admin"] });
            } catch (err) {
              toast.error(apiErrorMessage(err));
              throw err;
            }
          },
        })}>Annuler</ActionButton>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Référence, email, téléphone ou conducteur" />
        <Select label="Statut" value={statut} onChange={setStatut} options={STATUTS} className="sm:w-64" />
      </div>
      <AdminTable colonnes={colonnes} lignes={data?.results} cle={(l) => l.id} titreMobile={(l) => colonnes[0].cellule(l)} actions={actions}
        chargement={isLoading || isFetching} erreur={isError} onReessayer={refetch} />
      {data && <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} onChange={setPage} />}

      <Panneau ouvert={!!attribution} titre="Attribuer un loueur" onFermer={() => setAttribution(null)} onValider={attribuer} envoi={envoi} libelle="Attribuer">
        {attribution && (
          <div className="text-sm bg-light-muted rounded-xl p-3 space-y-1">
            <p className="font-semibold text-dark">{attribution.categorie} · {attribution.formule_libelle} · {attribution.passagers} passager(s)</p>
            <p className="text-gray-600">{dateHeure(attribution.debut)} → {dateHeure(attribution.fin)}</p>
            <p className="text-gray-600">{attribution.lieu_prise}{attribution.adresse_prise ? ` · ${attribution.adresse_prise}` : ""}</p>
            {attribution.precisions && <p className="text-gray-600 italic">« {attribution.precisions} »</p>}
            {attribution.conducteur && <p className="text-gray-600">Conducteur : {attribution.conducteur} · permis {attribution.permis_numero} ({attribution.permis_pays})</p>}
          </div>
        )}
        {erreurs.detail && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erreurs.detail}</p>}
        <Champ label="Loueur" erreur={erreurs.partenaire} aide={loueurs.length ? undefined : "Aucun loueur actif ne propose cette catégorie à ce lieu."}>
          <Liste value={form.partenaire} onChange={(e) => setForm({ ...form, partenaire: e.target.value })} required
            options={[{ value: "", label: "Choisir" }, ...loueurs.map((p) => ({ value: String(p.id), label: `${p.nom} · ${p.telephone}` }))]} />
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Véhicule remis" erreur={erreurs.vehicule}><Saisie value={form.vehicule} onChange={(e) => setForm({ ...form, vehicule: e.target.value })} required placeholder="Toyota Corolla grise" /></Champ>
          <Champ label="Immatriculation"><Saisie value={form.immatriculation} onChange={(e) => setForm({ ...form, immatriculation: e.target.value })} placeholder="TG 1234 AB" /></Champ>
        </div>
        {attribution?.formule === "avec_chauffeur" && (
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Chauffeur" erreur={erreurs.chauffeur_nom}><Saisie value={form.chauffeur_nom} onChange={(e) => setForm({ ...form, chauffeur_nom: e.target.value })} required /></Champ>
            <Champ label="Téléphone du chauffeur"><Saisie type="tel" value={form.chauffeur_telephone} onChange={(e) => setForm({ ...form, chauffeur_telephone: e.target.value })} required /></Champ>
          </div>
        )}
      </Panneau>
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
