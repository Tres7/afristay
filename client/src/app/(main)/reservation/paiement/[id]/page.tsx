"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Clock, CreditCard, Loader2, Lock, Smartphone, Wallet, XCircle } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { allerPayer, enEuros, minutesRestantes, useConfigPaiement } from "@/lib/paiement";
import { cn, FALLBACK_IMAGE, formatDate, formatPrice } from "@/lib/utils";
import type { Reservation } from "@/types/api/models";
import type { MoyenPaiement, StatutPaiementReservation } from "@/types/api/paiement";

const MOYENS: { id: MoyenPaiement; label: string; icon: typeof Smartphone }[] = [
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { id: "carte", label: "Carte bancaire", icon: CreditCard },
  { id: "paypal", label: "PayPal", icon: Wallet },
];

// Au-delà, on arrête d'interroger le serveur : le worker et le webhook prennent le relais
const ATTENTE_MAX_MS = 3 * 60 * 1000;

function PaiementContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: config } = useConfigPaiement();
  const [debut] = useState(() => Date.now());
  const [moyen, setMoyen] = useState<MoyenPaiement | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(searchParams.get("erreur") || "");
  const annuleParVoyageur = searchParams.get("annule") === "1";

  const { data: reservation } = useQuery({
    queryKey: ["reservation", params.id],
    queryFn: async () => (await api.get<Reservation>(`/v1/reservations/${params.id}/`)).data,
    retry: false,
  });

  const { data: statut, isError } = useQuery({
    queryKey: ["paiement-statut", params.id],
    queryFn: async () => (await api.get<StatutPaiementReservation>(`/v1/paiements/reservations/${params.id}/statut/`)).data,
    refetchInterval: (q) => {
      const s = q.state.data;
      const enAttente = s?.reservation === "pending" && s.paiement === "en_attente" && !annuleParVoyageur;
      return enAttente && Date.now() - debut < ATTENTE_MAX_MS ? 3000 : false;
    },
    retry: false,
  });

  useEffect(() => {
    if (statut?.reservation === "confirmed") {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservation", params.id] });
      router.replace(`/reservation/confirmation/${params.id}`);
    }
  }, [statut?.reservation, params.id, router, queryClient]);

  const moyensDispo = MOYENS.filter((m) => config?.moyens.includes(m.id));
  const moyenChoisi = moyen ?? (reservation && moyensDispo.some((m) => m.id === reservation.payment_method) ? reservation.payment_method : moyensDispo[0]?.id);

  const payer = async () => {
    if (!moyenChoisi) return;
    setEnvoi(true);
    setErreur("");
    try {
      await allerPayer(params.id, moyenChoisi);
    } catch (err) {
      setErreur(apiErrorMessage(err, "Le paiement n'a pas pu démarrer."));
      setEnvoi(false);
    }
  };

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-heading font-bold text-xl text-dark">Réservation introuvable</p>
        <Link href="/profil/reservations" className="text-primary font-bold hover:underline">Voir mes réservations</Link>
      </div>
    );
  }

  const minutes = minutesRestantes(statut?.expire_le ?? null);
  const enAttente = statut?.reservation === "pending" && statut.paiement === "en_attente" && !annuleParVoyageur;
  const attenteLongue = enAttente && Date.now() - debut >= ATTENTE_MAX_MS;
  const aPayer = statut?.reservation === "pending" && !enAttente;
  const total = reservation?.montants.total ?? 0;

  return (
    <div className="bg-light min-h-[70vh]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 sm:p-8" aria-live="polite">
          {!statut || statut.reservation === "confirmed" ? (
            <Etat icone={<Loader2 size={32} className="animate-spin text-primary" />} titre="Vérification du paiement…" />
          ) : statut.reservation === "cancelled" ? (
            <Etat
              icone={<XCircle size={32} className="text-red-600" />}
              titre={statut.annule_par === "expiration" ? "Délai de paiement dépassé" : "Réservation annulée"}
              texte={statut.annule_par === "expiration"
                ? "Le paiement n'a pas été reçu à temps : les dates ont été libérées. Si un montant a été débité, il vous sera remboursé automatiquement."
                : "Cette réservation a été annulée."}
            >
              {reservation && (
                <Link href={`/hebergements/${reservation.hebergement}`} className="inline-block mt-6 bg-primary text-white font-bold px-6 py-3 rounded-xl">
                  Réserver à nouveau
                </Link>
              )}
            </Etat>
          ) : enAttente && !attenteLongue ? (
            <Etat
              icone={<Loader2 size={32} className="animate-spin text-primary" />}
              titre="Nous attendons la confirmation du paiement"
              texte="Si vous payez par Mobile Money, validez la demande reçue sur votre téléphone. Cette page se met à jour toute seule."
            />
          ) : attenteLongue ? (
            <Etat
              icone={<Clock size={32} className="text-amber-600" />}
              titre="Paiement toujours en cours de traitement"
              texte="La confirmation peut prendre quelques minutes. Vous la verrez dans vos réservations dès qu'elle arrive ; inutile de payer une seconde fois."
            >
              <Link href="/profil/reservations" className="inline-block mt-6 bg-primary text-white font-bold px-6 py-3 rounded-xl">Mes réservations</Link>
            </Etat>
          ) : null}

          {aPayer && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <AlertCircle size={30} className="text-amber-600" />
                </div>
                <h1 className="font-heading font-bold text-dark text-2xl">
                  {statut.paiement === "echoue" ? "Le paiement a échoué" : annuleParVoyageur || statut.paiement === "annule" ? "Paiement annulé" : "Paiement en attente"}
                </h1>
                <p className="text-gray-600 text-sm mt-2">
                  Aucun montant n&apos;a été débité.{" "}
                  {minutes !== null && minutes > 0 && <>Vos dates restent bloquées encore <strong>{minutes} minute{minutes > 1 ? "s" : ""}</strong>.</>}
                </p>
              </div>

              {reservation && (
                <div className="flex gap-4 items-center mt-6 p-4 rounded-2xl bg-gray-50">
                  <img src={reservation.hebergement_detail.image_url || FALLBACK_IMAGE} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-dark text-sm truncate">{reservation.hebergement_detail.name}</p>
                    <p className="text-xs text-gray-600">{formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}</p>
                  </div>
                  <p className="font-heading font-bold text-dark whitespace-nowrap">{formatPrice(total)}</p>
                </div>
              )}

              <fieldset className="mt-6">
                <legend className="text-xs font-bold text-dark uppercase tracking-wide mb-3">Payer avec</legend>
                <div className="grid grid-cols-3 gap-2">
                  {moyensDispo.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id} type="button" aria-pressed={moyenChoisi === id} onClick={() => setMoyen(id)}
                      className={cn("flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-colors",
                        moyenChoisi === id ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-dark hover:border-primary/40")}
                    >
                      <Icon size={20} /> {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {erreur && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mt-4">{erreur}</p>}

              <button onClick={payer} disabled={envoi || !moyenChoisi}
                className="w-full mt-6 bg-secondary hover:bg-secondary-600 text-white font-bold py-4 rounded-2xl shadow-md disabled:opacity-60">
                {envoi ? "Redirection…" : `Payer ${moyenChoisi === "paypal" && config ? enEuros(total, config.fcfa_par_euro) : formatPrice(total)}`}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-gray-600 mt-3">
                <Lock size={12} /> Paiement sécurisé par {moyenChoisi === "paypal" ? "PayPal" : "FedaPay"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Etat({ icone, titre, texte, children }: { icone: React.ReactNode; titre: string; texte?: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-4">{icone}</div>
      <h1 className="font-heading font-bold text-dark text-2xl">{titre}</h1>
      {texte && <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">{texte}</p>}
      {children}
    </div>
  );
}

export default function PaiementPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-light" />}>
      <PaiementContent />
    </Suspense>
  );
}
