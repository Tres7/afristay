"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Info, Smartphone, CreditCard, Wallet, MapPin, Star } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { calculateNights, calculateServiceFee, cn, FALLBACK_IMAGE, formatDate, formatPrice, isoDate } from "@/lib/utils";
import type { Hebergement, Reservation } from "@/types/api/models";

const PAYMENT_METHODS = [
  { id: "mobile_money", label: "Mobile Money", sublabel: "MTN, Orange, Moov, Wave", icon: Smartphone },
  { id: "carte", label: "Carte bancaire", sublabel: "Visa, Mastercard", icon: CreditCard },
  { id: "paypal", label: "PayPal", sublabel: "Compte PayPal", icon: Wallet },
] as const;

function ReservationContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const checkIn = searchParams.get("check_in") || "";
  const checkOut = searchParams.get("check_out") || "";
  const guestsCount = Math.max(1, parseInt(searchParams.get("guests") || "1", 10) || 1);

  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("mobile_money");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: hebergement, isLoading, isError } = useQuery({
    queryKey: ["hebergement", params.id, "reservation"],
    queryFn: async () => (await api.get<Hebergement>(`/v1/hebergements/${params.id}/`)).data,
    retry: false,
  });

  if (isLoading) {
    return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10"><div className="h-96 skeleton rounded-3xl" /></div>;
  }

  if (isError || !hebergement) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="font-heading font-bold text-xl text-dark">Hébergement introuvable</p>
        <Link href="/recherche" className="text-primary font-bold hover:underline">Retour à la recherche</Link>
      </div>
    );
  }

  const nights = calculateNights(checkIn, checkOut);
  const datesInvalid = !checkIn || !checkOut || nights <= 0 || checkIn < isoDate();
  const subtotal = hebergement.price_per_night * nights;
  const serviceFee = calculateServiceFee(subtotal);
  const total = subtotal + serviceFee;
  const backToListing = `/hebergements/${hebergement.id}?check_in=${checkIn}&check_out=${checkOut}&guests=${guestsCount}`;

  const handleConfirm = async () => {
    if (datesInvalid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post<Reservation>("/v1/reservations/", {
        hebergement: hebergement.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guestsCount,
        payment_method: paymentMethod,
        message: message.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      router.push(`/reservation/confirmation/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "La réservation n'a pas pu être enregistrée."));
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-light pb-12">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-dark hover:text-primary transition-colors" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-heading font-bold text-dark text-lg sm:text-xl">Confirmer et payer</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading font-bold text-dark text-xl">Votre voyage</h2>
                <Link href={backToListing} className="text-sm font-bold text-primary hover:underline">Modifier</Link>
              </div>
              {datesInvalid ? (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">
                  Dates invalides ou passées. <Link href={backToListing} className="font-bold underline">Choisir d&apos;autres dates</Link>
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-bold text-dark">Dates</p>
                    <p className="text-gray-500 mt-0.5">{formatDate(checkIn)} – {formatDate(checkOut)}</p>
                    <p className="text-gray-500">{nights} nuit{nights > 1 ? "s" : ""}</p>
                  </div>
                  <div>
                    <p className="font-bold text-dark">Voyageurs</p>
                    <p className="text-gray-500 mt-0.5">{guestsCount} voyageur{guestsCount > 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Réservé par</h2>
              <p className="text-sm text-dark font-semibold">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              <label htmlFor="message" className="block text-xs font-bold text-dark uppercase tracking-wide mb-2 mt-6">
                Message à l&apos;hôte <span className="normal-case font-normal text-gray-400">(optionnel)</span>
              </label>
              <textarea
                id="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000}
                placeholder="Heure d'arrivée prévue, questions particulières…" rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-base sm:text-sm text-dark outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-5">Mode de paiement</h2>
              <div className="space-y-3" role="radiogroup">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id} type="button" role="radio" aria-checked={isActive}
                      onClick={() => setPaymentMethod(method.id)}
                      className={cn("w-full flex items-center gap-4 rounded-2xl p-4 sm:p-5 border transition-all", isActive ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 hover:border-primary/30")}
                    >
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-colors flex-shrink-0", isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                        <Icon size={20} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className={cn("font-bold text-sm", isActive ? "text-primary" : "text-dark")}>{method.label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{method.sublabel}</p>
                      </div>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", isActive ? "border-primary bg-primary" : "border-gray-300")}>
                        {isActive && <Check size={10} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="flex items-start gap-2 text-xs text-gray-500 mt-4 bg-gray-50 rounded-xl p-3">
                <Info size={14} className="flex-shrink-0 mt-0.5 text-primary" />
                Le paiement en ligne n&apos;est pas encore activé : aucun montant n&apos;est prélevé à cette étape. Le mode choisi est transmis à l&apos;hôte.
              </p>
            </section>
          </div>

          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-5 sm:p-6 lg:sticky lg:top-28">
              <div className="flex gap-4 pb-5 border-b border-gray-100">
                <img src={hebergement.image_url || FALLBACK_IMAGE} alt={hebergement.name} className="w-24 h-20 rounded-2xl object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-dark text-sm line-clamp-2">{hebergement.name}</h3>
                  <p className="flex items-center gap-1 text-gray-500 text-xs mt-1"><MapPin size={12} className="text-primary flex-shrink-0" /><span className="truncate">{hebergement.city}</span></p>
                  <p className="flex items-center gap-1 text-xs font-bold text-dark mt-1"><Star size={12} className="fill-accent text-accent" />{hebergement.rating.toFixed(1)}</p>
                </div>
              </div>

              <div className="py-5 space-y-3 border-b border-gray-100 text-sm">
                <h3 className="font-heading font-bold text-dark text-base mb-2">Détails du prix</h3>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">{formatPrice(hebergement.price_per_night)} × {nights} nuit{nights > 1 ? "s" : ""}</span>
                  <span className="font-medium text-dark">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Frais de service (8 %)</span>
                  <span className="font-medium text-dark">{formatPrice(serviceFee)}</span>
                </div>
              </div>

              <div className="pt-5 flex justify-between items-center mb-5">
                <span className="font-heading font-bold text-dark text-lg">Total</span>
                <span className="font-heading font-bold text-primary text-2xl">{formatPrice(total)}</span>
              </div>

              {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">{error}</p>}

              <button onClick={handleConfirm} disabled={submitting || datesInvalid} className="w-full bg-secondary hover:bg-secondary-600 text-white font-bold py-4 rounded-2xl shadow-md transition-all text-base disabled:opacity-60">
                {submitting ? "Traitement..." : "Confirmer la réservation"}
              </button>

              <p className="text-center text-gray-400 text-xs mt-4 leading-relaxed">
                En confirmant, vous acceptez nos <Link href="/profil/aide#conditions" className="text-primary font-medium">Conditions</Link> et la{" "}
                <Link href="/profil/aide#annulation" className="text-primary font-medium">politique d&apos;annulation</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-light" />}>
      <ReservationContent />
    </Suspense>
  );
}
