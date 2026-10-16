"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Pill } from "@/components/backoffice/AdminTable";
import Panneau, { Champ, Interrupteur, Liste, Saisie, Zone, erreursApi } from "@/components/backoffice/Panneau";
import type { CategorieVehicule } from "@/types/api/admin";

const GAMMES = [["citadine", "Citadine"], ["berline", "Berline"], ["suv", "SUV"], ["4x4", "4x4 tout-terrain"], ["minibus", "Minibus"], ["utilitaire", "Utilitaire"]];
const BOITES = [["manuelle", "Manuelle"], ["automatique", "Automatique"]];
const CARBURANTS = [["essence", "Essence"], ["diesel", "Diesel"], ["hybride", "Hybride"], ["electrique", "Électrique"]];
// Le client API envoie du JSON par défaut : sans cet en-tête, le FormData (et la photo) serait converti en objet vide
const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };
const opts = (l: string[][]) => l.map(([value, label]) => ({ value, label }));

type Formulaire = Omit<CategorieVehicule, "id" | "image" | "prix_jour_sans_chauffeur" | "prix_jour_avec_chauffeur" | "caution" | "places" | "bagages" | "ordre"> & {
  prix_jour_sans_chauffeur: string; prix_jour_avec_chauffeur: string; caution: string; places: string; bagages: string; ordre: string;
};
const VIDE: Formulaire = {
  nom: "", gamme: "berline", exemple_modele: "", description: "", places: "5", bagages: "2", boite: "manuelle", carburant: "essence",
  climatisation: true, prix_jour_sans_chauffeur: "", prix_jour_avec_chauffeur: "", caution: "0", actif: false, ordre: "0",
};
const versFormulaire = (c: CategorieVehicule): Formulaire => ({
  ...c, places: String(c.places), bagages: String(c.bagages), ordre: String(c.ordre), caution: String(c.caution),
  prix_jour_sans_chauffeur: c.prix_jour_sans_chauffeur ? String(c.prix_jour_sans_chauffeur) : "",
  prix_jour_avec_chauffeur: c.prix_jour_avec_chauffeur ? String(c.prix_jour_avec_chauffeur) : "",
});

export default function Categories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin", "location", "categories"],
    queryFn: async () => (await api.get<CategorieVehicule[]>("/v1/admin/location/categories/")).data,
  });
  const [edition, setEdition] = useState<CategorieVehicule | "nouvelle" | null>(null);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [photo, setPhoto] = useState<File | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const champ = <K extends keyof Formulaire>(k: K) => (v: Formulaire[K]) => setForm((f) => ({ ...f, [k]: v }));

  const ouvrir = (c: CategorieVehicule | "nouvelle") => {
    setEdition(c);
    setForm(c === "nouvelle" ? VIDE : versFormulaire(c));
    setPhoto(null);
    setErreurs({});
  };

  const enregistrer = async () => {
    setEnvoi(true);
    setErreurs({});
    const corps = new FormData();
    for (const [k, v] of Object.entries(form)) {
      if (k === "id" || k === "image") continue; // la photo n'est envoyée que si une nouvelle est choisie
      // Prix vide = formule non proposée
      if ((k === "prix_jour_sans_chauffeur" || k === "prix_jour_avec_chauffeur") && v === "") continue;
      corps.append(k, typeof v === "boolean" ? (v ? "true" : "false") : String(v));
    }
    if (photo) corps.append("image", photo);
    try {
      if (edition === "nouvelle") await api.post("/v1/admin/location/categories/", corps, MULTIPART);
      else if (edition) {
        // Effacer un prix : envoyé à part en JSON (null), le multipart ne sait pas l'exprimer
        await api.patch(`/v1/admin/location/categories/${edition.id}/`, corps, MULTIPART);
        const nuls = Object.fromEntries((["prix_jour_sans_chauffeur", "prix_jour_avec_chauffeur"] as const).filter((k) => form[k] === "").map((k) => [k, null]));
        if (Object.keys(nuls).length) await api.patch(`/v1/admin/location/categories/${edition.id}/`, nuls);
      }
      toast.success("Catégorie enregistrée");
      setEdition(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "location"] });
    } catch (err) {
      setErreurs(erreursApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <p className="text-sm text-muted">Une catégorie n&apos;est proposée aux voyageurs qu&apos;active et avec au moins un prix par jour.</p>
        <button onClick={() => ouvrir("nouvelle")} className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold">Nouvelle catégorie</button>
      </div>
      {isLoading ? <div className="h-40 skeleton rounded-2xl" /> : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories?.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => ouvrir(c)} className="w-full text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-card transition-shadow">
                <div className="h-32 bg-gray-100 flex items-center justify-center">
                  {c.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.image} alt="" className="w-full h-full object-cover" />
                    : <Car size={36} className="text-gray-300" />}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading font-bold text-dark">{c.nom}</p>
                    <Pill ton={c.actif ? "vert" : "gris"}>{c.actif ? "Proposée" : "Désactivée"}</Pill>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{c.exemple_modele || "—"} · {c.places} places</p>
                  <p className="text-sm text-dark mt-2 tabular-nums">
                    Seule : {c.prix_jour_sans_chauffeur ? formatPrice(c.prix_jour_sans_chauffeur) : "—"} · Avec chauffeur : {c.prix_jour_avec_chauffeur ? formatPrice(c.prix_jour_avec_chauffeur) : "—"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Panneau ouvert={!!edition} titre={edition === "nouvelle" ? "Nouvelle catégorie" : "Modifier la catégorie"} onFermer={() => setEdition(null)} onValider={enregistrer} envoi={envoi}>
        {erreurs.detail && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erreurs.detail}</p>}
        <Champ label="Nom" erreur={erreurs.nom}><Saisie value={form.nom} onChange={(e) => champ("nom")(e.target.value)} required maxLength={80} placeholder="Berline confort" /></Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Gamme"><Liste value={form.gamme} onChange={(e) => champ("gamme")(e.target.value as Formulaire["gamme"])} options={opts(GAMMES)} /></Champ>
          <Champ label="Modèle (exemple)"><Saisie value={form.exemple_modele} onChange={(e) => champ("exemple_modele")(e.target.value)} placeholder="Toyota Corolla ou similaire" /></Champ>
          <Champ label="Places" erreur={erreurs.places}><Saisie type="number" min={1} value={form.places} onChange={(e) => champ("places")(e.target.value)} required /></Champ>
          <Champ label="Valises" erreur={erreurs.bagages}><Saisie type="number" min={0} value={form.bagages} onChange={(e) => champ("bagages")(e.target.value)} required /></Champ>
          <Champ label="Boîte"><Liste value={form.boite} onChange={(e) => champ("boite")(e.target.value as Formulaire["boite"])} options={opts(BOITES)} /></Champ>
          <Champ label="Carburant"><Liste value={form.carburant} onChange={(e) => champ("carburant")(e.target.value as Formulaire["carburant"])} options={opts(CARBURANTS)} /></Champ>
        </div>
        <Champ label="Description"><Zone value={form.description} onChange={(e) => champ("description")(e.target.value)} /></Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Prix / jour sans chauffeur" aide="Vide : formule non proposée" erreur={erreurs.prix_jour_sans_chauffeur}>
            <Saisie type="number" min={0} inputMode="numeric" value={form.prix_jour_sans_chauffeur} onChange={(e) => champ("prix_jour_sans_chauffeur")(e.target.value)} />
          </Champ>
          <Champ label="Prix / jour avec chauffeur" aide="Vide : formule non proposée" erreur={erreurs.prix_jour_avec_chauffeur}>
            <Saisie type="number" min={0} inputMode="numeric" value={form.prix_jour_avec_chauffeur} onChange={(e) => champ("prix_jour_avec_chauffeur")(e.target.value)} />
          </Champ>
          <Champ label="Caution (FCFA)" aide="Réglée au loueur à la remise"><Saisie type="number" min={0} value={form.caution} onChange={(e) => champ("caution")(e.target.value)} /></Champ>
          <Champ label="Ordre d'affichage"><Saisie type="number" min={0} value={form.ordre} onChange={(e) => champ("ordre")(e.target.value)} /></Champ>
        </div>
        <Champ label="Photo du véhicule" aide="JPEG, PNG ou WebP, 400 px minimum" erreur={erreurs.image}>
          <span className="flex items-center gap-2 text-sm text-dark"><ImagePlus size={16} className="text-primary" />
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-sm" />
          </span>
        </Champ>
        <Interrupteur label="Climatisation" checked={form.climatisation} onChange={champ("climatisation")} />
        <Interrupteur label="Proposée aux voyageurs" checked={form.actif} onChange={champ("actif")} />
        {erreurs.actif && <p role="alert" className="text-xs text-red-600">{erreurs.actif}</p>}
      </Panneau>
    </div>
  );
}
