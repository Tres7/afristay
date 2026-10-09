"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Award, CalendarDays, Check, Copy, Crown, Home, MapPin, MessageCircle, Plus, Search, Trash2, Users, Vote,
} from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { cn, FALLBACK_IMAGE, formatDate, formatPrice } from "@/lib/utils";
import FormField from "@/components/ui/FormField";
import RatingBadge from "@/components/avis/RatingBadge";
import type { Hebergement, Paginated, Reservation } from "@/types/api/models";
import type { Voyage } from "@/types/api/voyage";

type Onglet = "logements" | "itineraire" | "reservations" | "membres";

const ONGLETS: { id: Onglet; label: string; icon: typeof Home }[] = [
  { id: "logements", label: "Logements", icon: Home },
  { id: "itineraire", label: "Itinéraire", icon: CalendarDays },
  { id: "reservations", label: "Réservations et infos", icon: Check },
  { id: "membres", label: "Membres", icon: Users },
];

function messageErreur(err: unknown, defaut: string) {
  const data = (err as { response?: { data?: Record<string, string[] | string> } }).response?.data;
  if (data && typeof data === "object" && !("detail" in data)) {
    const premier = Object.values(data)[0];
    return Array.isArray(premier) ? premier[0] : String(premier);
  }
  return apiErrorMessage(err, defaut);
}

function VoyageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [onglet, setOnglet] = useState<Onglet>("logements");
  const cle = ["voyage", params.id];

  const { data: v, isError } = useQuery({
    queryKey: cle,
    queryFn: async () => (await api.get<Voyage>(`/v1/voyages/${params.id}/`)).data,
    // Les autres membres votent et proposent : on rafraîchit régulièrement
    refetchInterval: 15000,
    retry: false,
  });

  useEffect(() => {
    if (searchParams.get("nouveau") === "1") {
      setOnglet("membres");
      router.replace(`/together/${params.id}`);
    }
  }, [searchParams, router, params.id]);

  const appliquer = (data: Voyage) => queryClient.setQueryData(cle, data);
  const recharger = () => queryClient.invalidateQueries({ queryKey: cle });

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="font-heading font-bold text-xl text-dark">Voyage introuvable</p>
        <p className="text-gray-600 text-sm">Vous n&apos;en faites peut-être pas (ou plus) partie.</p>
        <Link href="/together" className="text-primary font-bold hover:underline">Mes voyages de groupe</Link>
      </div>
    );
  }
  if (!v) return <div className="max-w-5xl mx-auto px-4 py-10"><div className="h-96 skeleton rounded-3xl" /></div>;

  return (
    <div className="bg-light min-h-[70vh] pb-12">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-0">
          <Link href="/together" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-dark"><ArrowLeft size={16} /> Mes voyages</Link>
          <div className="flex flex-wrap items-end justify-between gap-3 mt-3">
            <div>
              <h1 className="font-heading font-bold text-dark text-2xl sm:text-3xl">{v.nom}</h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1"><MapPin size={14} className="text-primary" /> {v.destination}</span>
                {v.date_debut && v.date_fin
                  ? <span>{formatDate(v.date_debut)} → {formatDate(v.date_fin)} · {v.nuits} nuit{v.nuits! > 1 ? "s" : ""}</span>
                  : <span>Dates à définir</span>}
                <span>{v.nb_voyageurs} voyageur{v.nb_voyageurs > 1 ? "s" : ""}</span>
              </p>
            </div>
            <div className="flex -space-x-2" aria-label={`${v.membres.length} membres`}>
              {v.membres.slice(0, 6).map((m) => (
                <span key={m.id} title={m.nom} className="w-9 h-9 rounded-full bg-primary/10 border-2 border-white text-primary text-xs font-bold flex items-center justify-center">
                  {m.nom.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-6 mt-5 overflow-x-auto scrollbar-hide" role="tablist">
            {ONGLETS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)}
                className={cn("flex items-center gap-1.5 pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors",
                  onglet === id ? "text-primary border-primary" : "text-gray-500 border-transparent hover:text-dark")}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {onglet === "logements" && <Logements v={v} appliquer={appliquer} recharger={recharger} />}
        {onglet === "itineraire" && <Itineraire v={v} appliquer={appliquer} recharger={recharger} />}
        {onglet === "reservations" && <Reservations v={v} appliquer={appliquer} recharger={recharger} />}
        {onglet === "membres" && <Membres v={v} recharger={recharger} />}
      </div>
    </div>
  );
}

interface SectionProps {
  v: Voyage;
  appliquer: (d: Voyage) => void;
  recharger: () => void;
}

function Logements({ v, appliquer, recharger }: SectionProps) {
  const [recherche, setRecherche] = useState(v.destination);
  const [ouvert, setOuvert] = useState(v.propositions.length === 0);
  const deja = new Set(v.propositions.map((p) => p.hebergement.id));

  const { data: resultats = [], isFetching } = useQuery({
    queryKey: ["hebergements", "together", recherche, v.date_debut, v.date_fin],
    queryFn: async () => (await api.get<Paginated<Hebergement>>("/v1/hebergements/", {
      params: { q: recherche || undefined, check_in: v.date_debut || undefined, check_out: v.date_fin || undefined, limit: 12 },
    })).data.results,
    enabled: ouvert,
  });

  const action = async (fn: () => Promise<{ data: Voyage }>, succes?: string) => {
    try {
      const res = await fn();
      if (res?.data?.id) appliquer(res.data);
      else recharger();
      if (succes) toast.success(succes);
    } catch (err) {
      toast.error(messageErreur(err, "L'action n'a pas abouti."));
    }
  };

  const retenue = v.propositions.find((p) => p.id === v.proposition_retenue);
  const reserverUrl = retenue && v.date_debut && v.date_fin
    ? `/reservation/${retenue.hebergement.id}?check_in=${v.date_debut}&check_out=${v.date_fin}&guests=${Math.min(v.nb_voyageurs, retenue.hebergement.max_guests)}`
    : null;

  return (
    <div className="space-y-5">
      {retenue && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-secondary/10 border border-secondary/30 rounded-2xl p-4">
          <Award size={22} className="text-secondary flex-shrink-0" />
          <p className="flex-1 text-sm text-dark">Logement retenu : <strong>{retenue.hebergement.name}</strong>
            {retenue.budget && <> — {formatPrice(retenue.budget.par_personne)} par personne</>}</p>
          {reserverUrl && v.est_organisateur && (
            <Link href={reserverUrl} className="px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-bold text-center">Réserver pour le groupe</Link>
          )}
        </div>
      )}

      {!v.nuits && (
        <p className="text-sm text-amber-900 bg-amber-50 rounded-xl px-4 py-3">
          Ajoutez les dates du voyage (onglet Membres, organisateur) pour voir le budget par personne et la disponibilité.
        </p>
      )}

      {v.propositions.length === 0 ? (
        <p className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">Aucun logement proposé. Proposez-en un ci-dessous.</p>
      ) : (
        <ul className="space-y-3">
          {v.propositions.map((p) => {
            const h = p.hebergement;
            const monChoix = v.mon_vote === p.id;
            return (
              <li key={p.id} className={cn("bg-white rounded-2xl border p-4 flex flex-col sm:flex-row gap-4", monChoix ? "border-primary" : "border-gray-100")}>
                <Link href={`/hebergements/${h.id}`} className="sm:w-40 h-32 flex-shrink-0">
                  <img src={h.image_url || FALLBACK_IMAGE} alt={h.name} className="w-full h-full object-cover rounded-xl" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/hebergements/${h.id}`} className="font-heading font-bold text-dark hover:text-primary">{h.name}</Link>
                      <p className="text-sm text-gray-600">{h.city} · {h.max_guests} pers. max · {formatPrice(h.price_per_night)}/nuit</p>
                      <RatingBadge rating={h.rating} count={h.review_count} className="mt-1" />
                    </div>
                    {v.proposition_retenue === p.id && <span className="text-xs font-bold bg-secondary text-white px-2.5 py-1 rounded-full">Retenu</span>}
                  </div>
                  {p.commentaire && <p className="text-sm text-gray-700 italic mt-2">« {p.commentaire} » — {p.propose_par}</p>}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {p.disponible === false && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 font-semibold">Pris à ces dates</span>}
                    {!p.assez_grand && <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold">Trop petit pour {v.nb_voyageurs}</span>}
                  </div>
                </div>
                <div className="sm:w-48 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  {p.budget ? (
                    <div className="sm:text-right">
                      <p className="font-heading font-bold text-dark text-lg">{formatPrice(p.budget.par_personne)}</p>
                      <p className="text-xs text-gray-600">par personne · {formatPrice(p.budget.total)} au total</p>
                    </div>
                  ) : <span />}
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => action(() => monChoix ? api.delete(`/v1/voyages/${v.id}/vote/`) : api.post(`/v1/voyages/${v.id}/vote/`, { proposition: p.id }))}
                      aria-pressed={monChoix}
                      className={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold",
                        monChoix ? "bg-primary text-white" : "border border-primary/40 text-primary hover:bg-primary/5")}
                    >
                      <Vote size={15} /> {p.votes} vote{p.votes > 1 ? "s" : ""}{monChoix && <span className="sr-only"> (votre choix)</span>}
                    </button>
                    {v.est_organisateur && v.proposition_retenue !== p.id && (
                      <button onClick={() => action(() => api.post(`/v1/voyages/${v.id}/retenir/`, { proposition: p.id }), "Logement retenu pour le groupe")}
                        className="px-3 py-2 rounded-full border border-gray-200 text-xs font-bold text-dark hover:bg-gray-50">Retenir</button>
                    )}
                    {p.peut_supprimer && (
                      <button onClick={() => action(() => api.delete(`/v1/voyages/${v.id}/propositions/${p.id}/`) as Promise<{ data: Voyage }>)}
                        aria-label={`Retirer ${h.name} des propositions`} className="p-2 rounded-full text-gray-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {p.votants.length > 0 && <p className="text-[11px] text-gray-600 sm:text-right">{p.votants.join(", ")}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <button onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="flex items-center gap-2 font-heading font-bold text-dark">
          <Plus size={18} className="text-primary" /> Proposer un logement
        </button>
        {ouvert && (
          <div className="mt-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un logement"
                placeholder="Ville, quartier, nom du logement" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm outline-none focus:border-primary/50" />
            </div>
            <ul className={cn("grid sm:grid-cols-2 gap-3 mt-3", isFetching && "opacity-60")}>
              {resultats.filter((h) => !deja.has(h.id)).map((h) => (
                <li key={h.id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-100">
                  <img src={h.image_url || FALLBACK_IMAGE} alt="" className="w-16 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-dark truncate">{h.name}</p>
                    <p className="text-xs text-gray-600">{h.city} · {formatPrice(h.price_per_night)}/nuit</p>
                  </div>
                  <button onClick={() => action(() => api.post(`/v1/voyages/${v.id}/propositions/`, { hebergement: h.id }), "Logement proposé au groupe")}
                    className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold">Proposer</button>
                </li>
              ))}
              {!isFetching && resultats.length === 0 && <li className="text-sm text-gray-600">Aucun logement disponible pour cette recherche{v.date_debut ? " et ces dates" : ""}.</li>}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Itineraire({ v, appliquer, recharger }: SectionProps) {
  const [form, setForm] = useState({ date: v.date_debut ?? "", heure: "", titre: "", lieu: "", details: "" });
  const [envoi, setEnvoi] = useState(false);

  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      const res = await api.post<Voyage>(`/v1/voyages/${v.id}/etapes/`, { ...form, heure: form.heure || null });
      appliquer(res.data);
      setForm({ ...form, heure: "", titre: "", lieu: "", details: "" });
    } catch (err) {
      toast.error(messageErreur(err, "L'étape n'a pas pu être ajoutée."));
    } finally {
      setEnvoi(false);
    }
  };

  const jours = v.etapes.reduce<Record<string, Voyage["etapes"]>>((acc, e) => ({ ...acc, [e.date]: [...(acc[e.date] ?? []), e] }), {});

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        {Object.keys(jours).length === 0 ? (
          <p className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">L&apos;itinéraire est vide : ajoutez la première activité.</p>
        ) : Object.entries(jours).map(([jour, etapes]) => (
          <section key={jour} className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-heading font-bold text-dark capitalize">{new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</h3>
            <ol className="mt-3 space-y-3 border-l-2 border-primary/20 pl-4">
              {etapes.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-primary" aria-hidden="true" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-dark">{e.heure && <span className="text-primary mr-2">{e.heure.replace(":", " h ")}</span>}{e.titre}</p>
                      {e.lieu && <p className="text-xs text-gray-600 flex items-center gap-1"><MapPin size={11} /> {e.lieu}</p>}
                      {e.details && <p className="text-sm text-gray-700 mt-1">{e.details}</p>}
                      <p className="text-[11px] text-gray-500 mt-0.5">Ajouté par {e.ajoute_par}</p>
                    </div>
                    {e.peut_supprimer && (
                      <button onClick={async () => { await api.delete(`/v1/voyages/${v.id}/etapes/${e.id}/`); recharger(); }}
                        aria-label={`Supprimer ${e.titre}`} className="p-1.5 rounded-full text-gray-500 hover:text-red-700 hover:bg-red-50"><Trash2 size={14} /></button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <form onSubmit={ajouter} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 space-y-3 h-fit">
        <h3 className="font-heading font-bold text-dark">Ajouter une étape</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Jour" id="e-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            min={v.date_debut ?? undefined} max={v.date_fin ?? undefined} required />
          <FormField label="Heure" id="e-heure" type="time" value={form.heure} onChange={(e) => setForm({ ...form, heure: e.target.value })} />
        </div>
        <FormField label="Activité" id="e-titre" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Visite du marché de Treichville" maxLength={120} required />
        <FormField label="Lieu" id="e-lieu" value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} placeholder="Facultatif" />
        <FormField label="Détails" id="e-details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Rendez-vous, prix, à emporter…" maxLength={500} />
        <button type="submit" disabled={envoi || !form.date || !form.titre.trim()} className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60">
          {envoi ? "Ajout…" : "Ajouter à l'itinéraire"}
        </button>
      </form>
    </div>
  );
}

function Reservations({ v, appliquer, recharger }: SectionProps) {
  const [notes, setNotes] = useState(v.notes);
  const [sauvegarde, setSauvegarde] = useState(false);
  const { data: mesReservations = [] } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => (await api.get<Paginated<Reservation>>("/v1/reservations/")).data.results,
  });
  const partagees = new Set(v.reservations.map((r) => r.reservation_id));
  const aPartager = mesReservations.filter((r) => r.status !== "cancelled" && !partagees.has(r.id));

  const enregistrerNotes = async () => {
    setSauvegarde(true);
    try {
      appliquer((await api.patch<Voyage>(`/v1/voyages/${v.id}/`, { notes })).data);
      toast.success("Informations enregistrées");
    } catch (err) {
      toast.error(messageErreur(err, "Enregistrement impossible."));
    } finally {
      setSauvegarde(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-3">
        {v.reservations.length === 0 ? (
          <p className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">Aucune réservation partagée. Partagez la vôtre pour que tout le groupe ait l&apos;adresse et les dates.</p>
        ) : v.reservations.map((r) => (
          <article key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/hebergements/${r.hebergement_id}`} className="font-heading font-bold text-dark hover:text-primary">{r.hebergement}</Link>
                <p className="text-sm text-gray-600">{[r.adresse, r.ville].filter(Boolean).join(", ")}</p>
              </div>
              <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", r.statut === "confirmed" ? "bg-green-100 text-green-800" : r.statut === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700")}>
                {r.statut === "confirmed" ? "Confirmée" : r.statut === "pending" ? "Paiement en attente" : "Annulée"}
              </span>
            </div>
            <p className="text-sm text-dark mt-2">{formatDate(r.check_in)} → {formatDate(r.check_out)} · {r.voyageurs} voyageur{r.voyageurs > 1 ? "s" : ""} · {formatPrice(r.total)}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-600">Réservé par {r.reserve_par} · <span className="font-mono">{r.reference}</span></p>
              {r.peut_retirer && (
                <button onClick={async () => { await api.delete(`/v1/voyages/${v.id}/reservations/${r.id}/`); recharger(); }} className="text-xs text-gray-600 hover:text-red-700 underline">Ne plus partager</button>
              )}
            </div>
          </article>
        ))}
        {aPartager.length > 0 && (
          <section className="bg-white rounded-2xl border border-dashed border-gray-300 p-5">
            <h3 className="font-bold text-dark text-sm">Partager une de mes réservations</h3>
            <ul className="mt-2 space-y-2">
              {aPartager.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{r.hebergement_detail.name} · {formatDate(r.check_in)} → {formatDate(r.check_out)}</span>
                  <button onClick={async () => {
                    try { appliquer((await api.post<Voyage>(`/v1/voyages/${v.id}/reservations/`, { reservation: r.id })).data); }
                    catch (err) { toast.error(messageErreur(err, "Partage impossible.")); }
                  }} className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold flex-shrink-0">Partager</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 h-fit">
        <label htmlFor="v-notes" className="font-heading font-bold text-dark">Infos pratiques du groupe</label>
        <p className="text-xs text-gray-600 mt-1">Vols, horaires d&apos;arrivée, point de rendez-vous… Visible et modifiable par tous les membres.</p>
        <textarea id="v-notes" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000}
          className="w-full mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-base sm:text-sm outline-none focus:border-primary/50 resize-y" />
        <button onClick={enregistrerNotes} disabled={sauvegarde || notes === v.notes} className="w-full mt-3 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
          {sauvegarde ? "Enregistrement…" : "Enregistrer"}
        </button>
      </section>
    </div>
  );
}

function Membres({ v, recharger }: { v: Voyage; recharger: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [copie, setCopie] = useState(false);
  const [dates, setDates] = useState({ date_debut: v.date_debut ?? "", date_fin: v.date_fin ?? "", nb_voyageurs: v.nb_voyageurs });
  const lien = typeof window !== "undefined" ? `${window.location.origin}/together/rejoindre/${v.code_invitation}` : "";
  const texte = `Rejoins notre voyage « ${v.nom} » à ${v.destination} sur AfriStay : on choisit le logement ensemble ! ${lien}`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      toast.error("Copie impossible : sélectionnez le lien à la main.");
    }
  };

  const retirer = async (id: string, nom: string, moi: boolean) => {
    if (!window.confirm(moi ? "Quitter ce voyage ?" : `Retirer ${nom} du voyage ?`)) return;
    try {
      await api.delete(`/v1/voyages/${v.id}/membres/${id}/`);
      if (moi) {
        queryClient.invalidateQueries({ queryKey: ["voyages"] });
        router.push("/together");
      } else recharger();
    } catch (err) {
      toast.error(messageErreur(err, "Action impossible."));
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-5">
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-heading font-bold text-dark">Inviter des proches</h3>
          <p className="text-sm text-gray-600 mt-1">Toute personne qui a ce lien peut rejoindre le voyage après s&apos;être connectée.</p>
          <div className="flex gap-2 mt-3">
            <input readOnly value={lien} aria-label="Lien d'invitation" onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-dark" />
            <button onClick={copier} className="flex items-center gap-1.5 px-4 rounded-xl border border-gray-200 text-sm font-bold text-dark hover:bg-gray-50">
              {copie ? <Check size={15} className="text-secondary" /> : <Copy size={15} />} {copie ? "Copié" : "Copier"}
            </button>
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1D7A4C] text-white text-sm font-bold">
            <MessageCircle size={15} /> Envoyer sur WhatsApp<span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
          </a>
          {v.est_organisateur && (
            <button onClick={async () => { await api.post(`/v1/voyages/${v.id}/nouveau-lien/`); recharger(); toast.success("Nouveau lien créé : l'ancien ne fonctionne plus."); }}
              className="block mt-3 text-xs text-gray-600 underline hover:text-dark">Désactiver ce lien et en créer un nouveau</button>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-heading font-bold text-dark">{v.membres.length} membre{v.membres.length > 1 ? "s" : ""}</h3>
          <ul className="mt-3 divide-y divide-gray-100">
            {v.membres.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-dark">
                  {m.nom}{m.moi && " (vous)"}
                  {m.organisateur && <span className="flex items-center gap-1 text-xs font-bold text-primary"><Crown size={12} /> organise</span>}
                </span>
                {!m.organisateur && (m.moi || v.est_organisateur) && (
                  <button onClick={() => retirer(m.id, m.nom, m.moi)} className="text-xs text-gray-600 hover:text-red-700 underline">{m.moi ? "Quitter" : "Retirer"}</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {v.est_organisateur && (
        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 h-fit space-y-3">
          <h3 className="font-heading font-bold text-dark">Dates et taille du groupe</h3>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Arrivée" id="m-debut" type="date" value={dates.date_debut} onChange={(e) => setDates({ ...dates, date_debut: e.target.value })} />
            <FormField label="Départ" id="m-fin" type="date" value={dates.date_fin} onChange={(e) => setDates({ ...dates, date_fin: e.target.value })} />
          </div>
          <FormField label="Voyageurs" id="m-nb" type="number" min={1} max={20} value={dates.nb_voyageurs}
            onChange={(e) => setDates({ ...dates, nb_voyageurs: Number(e.target.value) })} />
          <button onClick={async () => {
            try {
              await api.patch(`/v1/voyages/${v.id}/`, { ...dates, date_debut: dates.date_debut || null, date_fin: dates.date_fin || null });
              recharger();
              toast.success("Voyage mis à jour");
            } catch (err) { toast.error(messageErreur(err, "Mise à jour impossible.")); }
          }} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold">Enregistrer</button>
          <button onClick={async () => {
            if (!window.confirm(`Supprimer définitivement « ${v.nom} » pour tous les membres ?`)) return;
            await api.delete(`/v1/voyages/${v.id}/`);
            queryClient.invalidateQueries({ queryKey: ["voyages"] });
            router.push("/together");
          }} className="w-full py-2.5 rounded-xl border border-red-200 text-red-700 text-sm font-bold hover:bg-red-50">Supprimer le voyage</button>
        </section>
      )}
    </div>
  );
}

export default function VoyagePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-light" />}>
      <VoyageContent />
    </Suspense>
  );
}
