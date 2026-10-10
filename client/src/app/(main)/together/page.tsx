"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Link2, MapPin, Plus, Users, Vote, Wallet } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { formatDate, isoDate } from "@/lib/utils";
import FormField from "@/components/ui/FormField";
import Stepper from "@/components/ui/Stepper";
import type { Voyage, VoyageResume } from "@/types/api/voyage";

const ATOUTS = [
  { icon: Link2, titre: "Invitez par lien", texte: "Envoyez le lien sur WhatsApp : vos proches rejoignent le voyage en un clic." },
  { icon: Vote, titre: "Votez pour le logement", texte: "Chacun propose des logements Kwa-Ba et vote pour son préféré." },
  { icon: Wallet, titre: "Budget par personne", texte: "Le coût de chaque logement, frais compris, divisé par le nombre de voyageurs." },
  { icon: CalendarDays, titre: "Itinéraire partagé", texte: "Activités, horaires, vols et réservations au même endroit." },
];

export default function TogetherPage() {
  const router = useRouter();
  const { status } = useSession();
  const connecte = status === "authenticated";
  const [creation, setCreation] = useState(false);
  const [form, setForm] = useState({ nom: "", destination: "", date_debut: "", date_fin: "", nb_voyageurs: 4 });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const { data: voyages = [], isLoading } = useQuery({
    queryKey: ["voyages"],
    queryFn: async () => (await api.get<{ results: VoyageResume[] }>("/v1/voyages/")).data.results,
    enabled: connecte,
  });

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    try {
      const res = await api.post<Voyage>("/v1/voyages/", {
        ...form, date_debut: form.date_debut || null, date_fin: form.date_fin || null,
      });
      router.push(`/together/${res.data.id}?nouveau=1`);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[] | string> } }).response?.data;
      if (data && typeof data === "object" && !("detail" in data)) {
        setErreurs(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)])));
      } else {
        setErreurs({ general: apiErrorMessage(err, "Le voyage n'a pas pu être créé.") });
      }
      setEnvoi(false);
    }
  };

  return (
    <div className="bg-light pb-12">
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-100"><Users size={16} /> Kwa-Ba Together</p>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mt-2 max-w-2xl">Organisez votre voyage à plusieurs, sans vous perdre dans WhatsApp</h1>
          <p className="text-white/85 mt-3 max-w-xl">Un espace commun pour choisir le logement ensemble, comparer le budget de chacun et partager l&apos;itinéraire.</p>
          {connecte ? (
            <button onClick={() => setCreation(true)} className="mt-6 inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-6 py-3 rounded-xl hover:bg-orange-50">
              <Plus size={18} /> Créer un voyage de groupe
            </button>
          ) : (
            <Link href="/login?callbackUrl=/together" className="mt-6 inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-6 py-3 rounded-xl">
              Se connecter pour commencer
            </Link>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {creation && (
          <form onSubmit={creer} noValidate className="bg-white rounded-3xl border border-gray-100 shadow-card p-5 sm:p-8 space-y-4">
            <h2 className="font-heading font-bold text-dark text-xl">Nouveau voyage de groupe</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nom du voyage" id="v-nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Abidjan entre amis" error={erreurs.nom} maxLength={80} required />
              <FormField label="Destination" id="v-destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
                placeholder="Abidjan" error={erreurs.destination} required />
              <FormField label="Arrivée" id="v-debut" type="date" min={isoDate()} value={form.date_debut}
                onChange={(e) => setForm({ ...form, date_debut: e.target.value })} hint="Facultatif : vous pourrez l'ajouter plus tard" />
              <FormField label="Départ" id="v-fin" type="date" min={form.date_debut || isoDate()} value={form.date_fin}
                onChange={(e) => setForm({ ...form, date_fin: e.target.value })} error={erreurs.date_fin} />
            </div>
            <Stepper label="Nombre de voyageurs" hint="Pour calculer le budget par personne" value={form.nb_voyageurs}
              onChange={(n) => setForm({ ...form, nb_voyageurs: n })} min={1} max={20} className="max-w-sm" />
            {erreurs.general && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erreurs.general}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setCreation(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-dark">Annuler</button>
              <button type="submit" disabled={envoi || !form.nom.trim() || !form.destination.trim()}
                className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60">
                {envoi ? "Création…" : "Créer et inviter"}
              </button>
            </div>
          </form>
        )}

        {connecte && (
          <section>
            <h2 className="font-heading font-bold text-dark text-xl mb-4">Mes voyages de groupe</h2>
            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}</div>
            ) : voyages.length === 0 ? (
              <p className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">
                Aucun voyage pour le moment. Créez-en un, ou demandez le lien d&apos;invitation à la personne qui organise.
              </p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-4">
                {voyages.map((v) => (
                  <li key={v.id}>
                    <Link href={`/together/${v.id}`} className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-card transition-shadow">
                      <p className="font-heading font-bold text-dark text-lg">{v.nom}</p>
                      <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-1"><MapPin size={14} className="text-primary" /> {v.destination}
                        {v.date_debut && v.date_fin && <> · {formatDate(v.date_debut)} → {formatDate(v.date_fin)}</>}
                      </p>
                      <p className="text-sm text-gray-600 mt-3">
                        {v.nb_membres} membre{v.nb_membres > 1 ? "s" : ""} · {v.nb_propositions} logement{v.nb_propositions > 1 ? "s" : ""} proposé{v.nb_propositions > 1 ? "s" : ""}
                        {v.est_organisateur ? " · vous organisez" : ` · organisé par ${v.organisateur}`}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ATOUTS.map(({ icon: Icon, titre, texte }) => (
            <div key={titre} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon size={20} /></div>
              <h3 className="font-heading font-bold text-dark mt-3">{titre}</h3>
              <p className="text-sm text-gray-600 mt-1">{texte}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
