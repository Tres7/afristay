"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Car, Clock, CreditCard, Lock, Luggage, Moon, Plane, ShieldCheck, Smartphone, Users, Wallet } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { enEuros, payerTransfert, useConfigPaiement } from "@/lib/paiement";
import { cn, formatPrice, isoDate } from "@/lib/utils";
import Select from "@/components/ui/Select";
import Stepper from "@/components/ui/Stepper";
import FormField from "@/components/ui/FormField";
import type { Reservation } from "@/types/api/models";
import type { MoyenPaiement } from "@/types/api/paiement";
import type { Aeroport, CategorieVehicule, Devis, Transfert } from "@/types/api/transfert";

const MOYENS: { id: MoyenPaiement; label: string; icon: typeof Smartphone }[] = [
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { id: "carte", label: "Carte bancaire", icon: CreditCard },
  { id: "paypal", label: "PayPal", icon: Wallet },
];

const champ = "w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-base sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function TransfertContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservation");
  const { data: session, status } = useSession();
  const connecte = status === "authenticated" && !!session && !session.error;
  const { data: config } = useConfigPaiement();

  const [aeroport, setAeroport] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [vol, setVol] = useState("");
  const [passagers, setPassagers] = useState(1);
  const [bagages, setBagages] = useState(1);
  const [categorie, setCategorie] = useState<CategorieVehicule | null>(null);
  const [destination, setDestination] = useState("");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState("");
  const [moyen, setMoyen] = useState<MoyenPaiement | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const { data: aeroports = [] } = useQuery({
    queryKey: ["transferts", "aeroports"],
    queryFn: async () => (await api.get<Aeroport[]>("/v1/transferts/aeroports/")).data,
    staleTime: 60 * 60 * 1000,
  });

  // Séjour AfriStay associé : on préremplit l'aéroport, la date, les voyageurs et l'adresse
  const { data: reservation } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: async () => (await api.get<Reservation>(`/v1/reservations/${reservationId}/`)).data,
    enabled: !!reservationId && connecte,
    retry: false,
  });

  useEffect(() => {
    if (!reservation) return;
    const h = reservation.hebergement_detail;
    setDate((d) => d || reservation.check_in);
    setPassagers(Math.min(7, reservation.guests_count));
    setDestination((d) => d || [h.name, h.location, h.city].filter(Boolean).join(", "));
    const ville = h.city.toLowerCase();
    const proche = aeroports.find((a) => ville.includes(a.ville.toLowerCase()) || a.ville.toLowerCase().includes(ville));
    if (proche) setAeroport((a) => a || proche.code);
  }, [reservation, aeroports]);

  const arrivee = date && heure ? `${date}T${heure}` : "";
  const { data: devis, isFetching: calcul } = useQuery({
    queryKey: ["transferts", "devis", aeroport, arrivee, passagers, bagages],
    queryFn: async () => (await api.get<Devis>("/v1/transferts/devis/", { params: { aeroport, arrivee, passagers, bagages } })).data,
    enabled: !!aeroport && !!arrivee,
    placeholderData: (precedent) => precedent,
  });

  const options = useMemo(() => devis?.options ?? [], [devis]);
  // Véhicule choisi, sinon le moins cher qui convient
  const choix = options.find((o) => o.categorie === categorie && o.disponible) ?? options.find((o) => o.disponible);
  const moyensDispo = MOYENS.filter((m) => config?.moyens.includes(m.id));
  const moyenChoisi = moyen && moyensDispo.some((m) => m.id === moyen) ? moyen : moyensDispo[0]?.id;
  const enLigne = !!config?.actif;

  const reserver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connecte) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`);
      return;
    }
    if (!choix) return;
    setEnvoi(true);
    setErreurs({});
    try {
      const res = await api.post<Transfert>("/v1/transferts/", {
        aeroport, arrivee, numero_vol: vol, passagers, bagages, categorie: choix.categorie,
        destination, telephone, message, reservation: reservation?.id ?? null,
      });
      if (res.data.statut === "en_attente_paiement" && moyenChoisi) {
        try {
          await payerTransfert(res.data.id, moyenChoisi);
          return;
        } catch {
          // Le paiement n'a pas démarré : la page du transfert permet de réessayer
        }
      }
      router.push(`/transfert/${res.data.id}`);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[] | string> } }).response?.data;
      if (data && typeof data === "object" && !("detail" in data)) {
        setErreurs(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)])));
      } else {
        setErreurs({ general: apiErrorMessage(err, "Le transfert n'a pas pu être réservé.") });
      }
      setEnvoi(false);
    }
  };

  const etiquette = "block text-xs font-bold text-dark uppercase tracking-wide mb-2";

  return (
    <div className="bg-light pb-12">
      <section className="bg-dark text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-200"><Plane size={16} /> Transfert aéroport</p>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mt-2 max-w-2xl">Votre chauffeur vous attend à l&apos;arrivée</h1>
          <p className="text-white/80 mt-3 max-w-xl">
            Un chauffeur partenaire AfriStay vous accueille à la sortie avec une pancarte à votre nom et vous conduit à votre logement. Prix fixe, payé à l&apos;avance.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-white/90">
            <li className="flex items-center gap-2"><Clock size={15} /> {devis?.attente_incluse_minutes ?? 60} min d&apos;attente incluses</li>
            <li className="flex items-center gap-2"><ShieldCheck size={15} /> Annulation gratuite jusqu&apos;à 24 h avant</li>
            <li className="flex items-center gap-2"><Lock size={15} /> Aucun prix négocié sur place</li>
          </ul>
        </div>
      </section>

      <form onSubmit={reserver} noValidate className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-5">
            <h2 className="font-heading font-bold text-dark text-xl">Votre vol</h2>
            {reservation && (
              <p className="text-sm text-dark bg-primary/5 rounded-xl px-4 py-3">
                Pour votre séjour à <strong>{reservation.hebergement_detail.name}</strong> : nous avons prérempli ce que nous savons.
              </p>
            )}
            <div>
              <p className={etiquette}>Aéroport d&apos;arrivée</p>
              <Select label="Aéroport d'arrivée" value={aeroport} onChange={setAeroport}
                options={aeroports.map((a) => ({ value: a.code, label: `${a.ville} — ${a.code}`, hint: a.nom }))} />
              {erreurs.aeroport && <p className="text-xs text-red-600 mt-1.5 ml-1">{erreurs.aeroport}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="t-date" className={etiquette}>Date d&apos;arrivée</label>
                <input id="t-date" type="date" min={isoDate()} value={date} onChange={(e) => setDate(e.target.value)} className={champ} required />
              </div>
              <div>
                <label htmlFor="t-heure" className={etiquette}>Heure d&apos;atterrissage</label>
                <input id="t-heure" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className={champ} aria-describedby="t-heure-aide" required />
                <p id="t-heure-aide" className="text-xs text-gray-600 mt-1.5 ml-1">Heure locale, comme sur votre billet</p>
              </div>
              <FormField label="Numéro de vol" id="t-vol" value={vol} onChange={(e) => setVol(e.target.value.toUpperCase())}
                placeholder="AF 520" error={erreurs.numero_vol} autoComplete="off" required />
            </div>
            {erreurs.arrivee && <p role="alert" className="text-sm text-red-700">{erreurs.arrivee}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-2">
              <Stepper label="Passagers" value={passagers} onChange={setPassagers} min={1} max={7} />
              <Stepper label="Bagages" hint="Valises en soute" value={bagages} onChange={setBagages} min={0} max={10} />
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8">
            <h2 className="font-heading font-bold text-dark text-xl">Véhicule</h2>
            {!aeroport || !arrivee ? (
              <p className="text-sm text-gray-600 mt-3">Choisissez l&apos;aéroport, la date et l&apos;heure pour voir les véhicules et leur prix.</p>
            ) : devis?.trop_tard ? (
              <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mt-3">
                Il faut réserver au moins {devis.delai_min_heures} heures avant l&apos;arrivée, le temps de vous attribuer un chauffeur.
              </p>
            ) : (
              <div className={cn("space-y-3 mt-4", calcul && "opacity-60")} role="radiogroup" aria-label="Véhicule" aria-busy={calcul}>
                {options.map((o) => {
                  const actif = choix?.categorie === o.categorie;
                  return (
                    <button
                      key={o.categorie} type="button" role="radio" aria-checked={actif} disabled={!o.disponible}
                      onClick={() => setCategorie(o.categorie)}
                      className={cn("w-full flex items-center gap-4 rounded-2xl p-4 border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                        actif ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 hover:border-primary/30")}
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", actif ? "bg-primary text-white" : "bg-gray-100 text-gray-600")}>
                        <Car size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold text-sm", actif ? "text-primary" : "text-dark")}>{o.nom}</p>
                        <p className="text-xs text-gray-600">{o.description}</p>
                        <p className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                          <span className="flex items-center gap-1"><Users size={12} /> {o.passagers}</span>
                          <span className="flex items-center gap-1"><Luggage size={12} /> {o.bagages}</span>
                          {!o.disponible && <span className="text-red-700 font-semibold">{o.motif}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-bold text-dark whitespace-nowrap">{formatPrice(o.prix)}</p>
                        {o.nuit && <p className="flex items-center justify-end gap-1 text-[11px] text-gray-600"><Moon size={11} /> tarif de nuit</p>}
                      </div>
                    </button>
                  );
                })}
                {options.length > 0 && !choix && <p className="text-sm text-red-700">Aucun véhicule ne convient : contactez-nous pour un groupe plus grand.</p>}
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-4">
            <h2 className="font-heading font-bold text-dark text-xl">Destination et contact</h2>
            <FormField label="Adresse de destination" id="t-destination" value={destination} onChange={(e) => setDestination(e.target.value)}
              placeholder="Nom du logement, quartier, ville" error={erreurs.destination} required />
            <FormField label="Votre numéro joignable à l'arrivée" id="t-telephone" type="tel" autoComplete="tel" value={telephone}
              onChange={(e) => setTelephone(e.target.value)} placeholder="+33 6 12 34 56 78" error={erreurs.telephone}
              hint="Avec l'indicatif. Le chauffeur vous contactera par appel ou WhatsApp." required />
            <div>
              <label htmlFor="t-message" className={etiquette}>Message au chauffeur <span className="normal-case font-normal text-gray-600">(facultatif)</span></label>
              <textarea id="t-message" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Siège enfant, poussette, aide pour les bagages…" className={cn(champ, "resize-none")} />
            </div>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-5 sm:p-6 lg:sticky lg:top-28 space-y-5">
            <h2 className="font-heading font-bold text-dark text-lg">Récapitulatif</h2>
            {choix ? (
              <dl className="text-sm space-y-2">
                <div className="flex justify-between gap-3"><dt className="text-gray-600">Véhicule</dt><dd className="font-medium text-dark">{choix.nom}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-600">Passagers · bagages</dt><dd className="font-medium text-dark">{passagers} · {bagages}</dd></div>
                {choix.nuit && <div className="flex justify-between gap-3"><dt className="text-gray-600">Tarif de nuit (22 h – 6 h)</dt><dd className="font-medium text-dark">inclus</dd></div>}
                <div className="flex justify-between items-center gap-3 pt-3 border-t border-gray-100">
                  <dt className="font-heading font-bold text-dark text-base">Total</dt>
                  <dd className="font-heading font-bold text-primary text-2xl">{formatPrice(choix.prix)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-600">Le prix s&apos;affiche dès que le vol et le véhicule sont choisis.</p>
            )}

            {enLigne && moyensDispo.length > 0 && (
              <fieldset>
                <legend className={etiquette}>Payer avec</legend>
                <div className="grid grid-cols-3 gap-2">
                  {moyensDispo.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" aria-pressed={moyenChoisi === id} onClick={() => setMoyen(id)}
                      className={cn("flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-colors",
                        moyenChoisi === id ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-dark hover:border-primary/40")}>
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {erreurs.general && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erreurs.general}</p>}

            <button type="submit" disabled={envoi || (connecte && (!choix || !vol || !destination || !telephone || devis?.trop_tard))}
              className="w-full bg-secondary hover:bg-secondary-600 text-white font-bold py-4 rounded-2xl shadow-md disabled:opacity-60">
              {!connecte
                ? "Se connecter pour réserver"
                : envoi
                  ? "Redirection vers le paiement…"
                  : choix
                    ? enLigne ? `Payer ${moyenChoisi === "paypal" && config ? enEuros(choix.prix, config.fcfa_par_euro) : formatPrice(choix.prix)}` : "Réserver le transfert"
                    : "Réserver le transfert"}
            </button>
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              Nom, numéro, véhicule et plaque de votre chauffeur vous sont envoyés au plus tard la veille. En réservant, vous acceptez nos{" "}
              <Link href="/cgu" className="text-primary font-medium">conditions</Link>.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

export default function TransfertPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-light" />}>
      <TransfertContent />
    </Suspense>
  );
}
