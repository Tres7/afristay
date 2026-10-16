"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Champ, Interrupteur, Saisie, Zone, erreursApi } from "@/components/backoffice/Panneau";
import { Pill } from "@/components/backoffice/AdminTable";
import type { SocieteAdmin } from "@/types/api/admin";

type Form = Omit<SocieteAdmin, "complets">;
type ChampTexte = Exclude<keyof Form, "assujetti_tva">;

export function useSociete() {
  return useQuery({
    queryKey: ["admin", "documents", "societe"],
    queryFn: async () => (await api.get<SocieteAdmin>("/v1/admin/documents/societe/")).data,
  });
}

/** Informations légales imprimées en tête des bons, reçus et factures. */
export default function Societe() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSociete();
  const [form, setForm] = useState<Form | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  if (isLoading || !form) return <div className="h-96 skeleton rounded-2xl" />;

  const champ = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const texte = (k: ChampTexte, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Champ label={label} erreur={erreurs[k]}>
      <Saisie value={form[k]} onChange={(e) => champ(k)(e.target.value)} {...props} />
    </Champ>
  );

  const enregistrer = async () => {
    setEnvoi(true);
    setErreurs({});
    try {
      const { data: maj } = await api.put<SocieteAdmin>("/v1/admin/documents/societe/", form);
      queryClient.setQueryData(["admin", "documents", "societe"], maj);
      toast.success("Informations enregistrées");
    } catch (err) {
      setErreurs(erreursApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form method="post" onSubmit={(e) => { e.preventDefault(); if (!envoi) enregistrer(); }}
      className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted flex-1 min-w-[220px]">
          Ces informations apparaissent en tête de chaque document. La raison sociale et l&apos;adresse sont obligatoires pour émettre une facture.
        </p>
        <Pill ton={data?.complets ? "vert" : "orange"}>{data?.complets ? "Complètes" : "À compléter"}</Pill>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {texte("raison_sociale", "Raison sociale", { required: true, placeholder: "Ex. Kwa-Ba SARL" })}
        {texte("nom_commercial", "Nom commercial")}
        {texte("forme_juridique", "Forme juridique", { placeholder: "SARL, SAS, SA…" })}
        {texte("pays", "Pays")}
        <Champ label="Adresse du siège" erreur={erreurs.adresse} className="sm:col-span-2">
          <Zone rows={2} value={form.adresse} onChange={(e) => champ("adresse")(e.target.value)} required />
        </Champ>
        {texte("nif", "NIF", { placeholder: "Numéro d'identification fiscale" })}
        {texte("rccm", "RCCM", { placeholder: "Ex. TG-LOM-01-2026-B12-00001" })}
        {texte("telephone", "Téléphone", { type: "tel" })}
        {texte("email", "Email", { type: "email" })}
        {texte("site", "Site web")}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <Interrupteur label="Assujettie à la TVA" checked={form.assujetti_tva} onChange={champ("assujetti_tva")} />
        {form.assujetti_tva && (
          <Champ label="Taux de TVA (%)" erreur={erreurs.taux_tva} aide="Les prix du site sont TTC : la TVA est extraite du total." className="sm:w-64">
            <Saisie type="number" min={0} max={100} step="0.01" value={form.taux_tva} onChange={(e) => champ("taux_tva")(e.target.value)} />
          </Champ>
        )}
        <Champ label="Mentions en pied de page" erreur={erreurs.mentions} aide="Capital social, conditions de paiement, coordonnées bancaires…">
          <Zone rows={3} value={form.mentions} onChange={(e) => champ("mentions")(e.target.value)} />
        </Champ>
      </div>

      {erreurs.detail && <p role="alert" className="text-sm text-red-600">{erreurs.detail}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={envoi} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-600 disabled:opacity-50">
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
