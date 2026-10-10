"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, MapPin, ChevronDown, ChevronUp, Share2, Calendar, MessageCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import AmenityBadge from "@/components/hebergement/AmenityBadge";
import FavoriteButton from "@/components/hebergement/FavoriteButton";
import RatingBadge from "@/components/avis/RatingBadge";
import AvisSection from "@/components/avis/AvisSection";
import ProposerAuGroupe from "@/components/voyage/ProposerAuGroupe";
import MapEmbed from "@/components/hebergement/MapEmbed";
import api, { apiErrorMessage } from "@/lib/api";
import { addDays, calculateNights, calculateServiceFee, cn, FALLBACK_IMAGE, formatDate, formatPrice, isoDate, TYPE_LABELS } from "@/lib/utils";
import { nuitsIndisponibles, useDisponibilites } from "@/lib/useDisponibilites";
import DateRangeCalendar from "@/components/calendrier/DateRangeCalendar";
import Stepper from "@/components/ui/Stepper";
import type { Hebergement } from "@/types/api/models";
import type { MessagingConversation } from "@/types/api/messaging";

function HebergementContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const today = isoDate();

  const [expanded, setExpanded] = useState(false);
  const [checkIn, setCheckIn] = useState(searchParams.get("check_in") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("check_out") || "");
  const [guests, setGuests] = useState(Number(searchParams.get("guests") || 1));
  const [contacting, setContacting] = useState(false);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);

  const { data: periodes = [], isLoading: dispoChargement } = useDisponibilites(params.id);
  const indisponibles = useMemo(() => nuitsIndisponibles(periodes), [periodes]);

  const choisirDates = (arrivee: string, depart: string) => {
    setCheckIn(arrivee);
    setCheckOut(depart);
    if (arrivee && depart) setCalendrierOuvert(false);
  };

  const { data: hebergement, isLoading, isError } = useQuery({
    queryKey: ["hebergement", params.id, status],
    queryFn: async () => (await api.get<Hebergement>(`/v1/hebergements/${params.id}/`)).data,
    enabled: status !== "loading",
    retry: false,
  });

  if (isLoading || status === "loading") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="h-10 w-2/3 skeleton rounded-xl" />
        <div className="h-72 md:h-[480px] skeleton rounded-3xl" />
      </div>
    );
  }

  if (isError || !hebergement) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-dark font-heading font-bold text-xl">Hébergement introuvable</p>
        <p className="text-muted">Il a peut-être été retiré par son hôte.</p>
        <Link href="/recherche" className="bg-primary text-white font-bold px-6 py-3 rounded-xl">Voir les hébergements</Link>
      </div>
    );
  }

  const isOwner = session?.user?.id === hebergement.host_id;
  const nights = calculateNights(checkIn, checkOut);
  const subtotal = hebergement.price_per_night * nights;
  const serviceFee = calculateServiceFee(subtotal);
  const total = subtotal + serviceFee;
  const gallery = [hebergement.image_url, ...hebergement.images.filter((i) => i !== hebergement.image_url)].filter(Boolean);
  const photos = gallery.length ? gallery : [FALLBACK_IMAGE];
  const reservationUrl = `/reservation/${hebergement.id}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`;
  // Dates arrivées par l'URL (recherche, lien partagé) mais déjà prises entre-temps
  let datesPrises = false;
  for (let d = checkIn; nights > 0 && d < checkOut; d = addDays(d, 1)) {
    if (indisponibles.has(d) || d < today) { datesPrises = true; break; }
  }
  const canBook = nights > 0 && !dispoChargement && !datesPrises && !isOwner && hebergement.is_available;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: hebergement.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié dans le presse-papiers");
      }
    } catch {
      /* partage annulé */
    }
  };

  const handleContact = async () => {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/hebergements/${hebergement.id}`)}`);
      return;
    }
    setContacting(true);
    try {
      // Idempotent : renvoie le fil existant si on a déjà contacté cet hôte pour ce logement
      const res = await api.post<MessagingConversation>("/v1/messaging/conversations/", { hebergement_id: hebergement.id });
      router.push(`/messages/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setContacting(false);
    }
  };

  const goBook = () => {
    if (!canBook) return;
    if (status !== "authenticated") router.push(`/login?callbackUrl=${encodeURIComponent(reservationUrl)}`);
    else router.push(reservationUrl);
  };

  return (
    <div className="bg-light pb-28 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted min-w-0">
          <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-primary transition-colors flex-shrink-0">
            <ArrowLeft size={14} /> Retour
          </button>
          <span>/</span>
          <span className="text-dark truncate">{hebergement.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-dark text-2xl sm:text-3xl">{hebergement.name}</h1>
            {hebergement.est_verifie && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
                <BadgeCheck size={14} /> Logement vérifié sur place par Kwa-Ba
              </p>
            )}
            <div className="flex items-center gap-x-3 gap-y-1 mt-2 flex-wrap text-sm">
              <a href="#avis" className="hover:underline" aria-label={hebergement.review_count ? `Note ${hebergement.rating.toFixed(1)} sur 5, voir les ${hebergement.review_count} avis` : "Nouveau logement, voir les avis"}>
                <RatingBadge rating={hebergement.rating} count={hebergement.review_count} variant="full" />
              </a>
              <span className="text-muted">·</span>
              <span className="flex items-center gap-1 text-muted"><MapPin size={14} />{hebergement.location ? `${hebergement.location}, ` : ""}{hebergement.city}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">{TYPE_LABELS[hebergement.type]} · jusqu&apos;à {hebergement.max_guests} voyageurs</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleShare} className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm text-dark hover:bg-light-muted transition-colors">
              <Share2 size={15} /><span className="hidden sm:inline">Partager</span>
            </button>
            <FavoriteButton variant="button" hebergementId={hebergement.id} initial={hebergement.is_favorite} />
          </div>
        </div>

        {/* Galerie : carrousel horizontal sur mobile, mosaïque sur desktop */}
        <div className="md:hidden -mx-4 mb-8 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {photos.map((img, i) => (
            <div key={img + i} className="snap-center flex-shrink-0 w-full px-4">
              <div className="relative">
                <img src={img} alt={`${hebergement.name} — photo ${i + 1}`} className="w-full h-64 object-cover rounded-2xl" />
                <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{i + 1}/{photos.length}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-3 h-[420px] lg:h-[480px] rounded-3xl overflow-hidden mb-12 shadow-card">
          {photos.slice(0, 5).map((img, i) => (
            <div key={img + i} className={i === 0 ? "col-span-2 row-span-2 overflow-hidden" : "overflow-hidden"} style={photos.length === 1 ? { gridColumn: "1 / -1", gridRow: "1 / -1" } : undefined}>
              <img src={img} alt={`${hebergement.name} — photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl shadow-card p-5 sm:p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0">
                  {hebergement.host_name?.[0]?.toUpperCase() ?? "H"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted">Hôte</p>
                  <p className="font-heading font-bold text-dark truncate">{hebergement.host_name || "Hôte Kwa-Ba"}</p>
                </div>
              </div>
              {isOwner ? (
                <Link href="/hote/espace" className="flex items-center gap-2 text-sm font-bold text-primary border border-primary/30 rounded-xl px-4 py-2 hover:bg-primary/5">
                  <Pencil size={15} /> Gérer
                </Link>
              ) : (
                <button onClick={handleContact} disabled={contacting} className="flex items-center gap-2 text-sm font-bold text-primary border border-primary/30 rounded-xl px-4 py-2 hover:bg-primary/5 disabled:opacity-50 flex-shrink-0">
                  <MessageCircle size={15} /> {contacting ? "Ouverture..." : "Contacter"}
                </button>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-card p-5 sm:p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Description</h2>
              <div className="text-gray-600 leading-relaxed">
                <motion.div animate={{ height: expanded ? "auto" : "4.8rem" }} transition={{ duration: 0.3 }} className="overflow-hidden" style={{ height: "4.8rem" }}>
                  <p className="whitespace-pre-line">{hebergement.description || "Aucune description disponible."}</p>
                </motion.div>
                {(hebergement.description?.length ?? 0) > 180 && (
                  <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-primary font-medium text-sm mt-3 hover:underline">
                    {expanded ? <>Voir moins <ChevronUp size={14} /></> : <>Voir plus <ChevronDown size={14} /></>}
                  </button>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-card p-5 sm:p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Équipements</h2>
              {hebergement.amenities.length > 0 ? (
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                  {hebergement.amenities.map((a) => <AmenityBadge key={a} amenity={a} />)}
                </div>
              ) : (
                <p className="text-muted text-sm">Aucun équipement renseigné.</p>
              )}
            </section>

            <AvisSection hebergementId={hebergement.id} isOwner={isOwner} hostName={hebergement.host_name || "l'hôte"} />

            <section className="bg-white rounded-2xl shadow-card p-5 sm:p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Localisation</h2>
              <div className="h-56 sm:h-64 rounded-xl overflow-hidden bg-light-muted">
                <MapEmbed lieu={hebergement.location} ville={hebergement.city} />
              </div>
              <p className="text-sm text-muted mt-3">L&apos;adresse exacte vous est communiquée après la réservation.</p>
            </section>
          </div>

          <div className="lg:col-span-1" id="reserver">
            <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-5 sm:p-7 lg:sticky lg:top-28">
              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-dark font-heading font-bold text-3xl">{formatPrice(hebergement.price_per_night)}</span>
                <span className="text-muted text-sm font-medium">/ nuit</span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  {([["Arrivée", checkIn], ["Départ", checkOut]] as const).map(([libelle, valeur]) => (
                    <button
                      key={libelle} type="button" onClick={() => setCalendrierOuvert(!calendrierOuvert)} aria-expanded={calendrierOuvert}
                      className={cn("px-4 py-3 text-left hover:bg-gray-50", calendrierOuvert && "bg-gray-50")}
                    >
                      <span className="text-[10px] text-dark font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={10} />{libelle}</span>
                      <span className={cn("text-sm font-medium", valeur ? "text-dark" : "text-gray-400")}>
                        {valeur ? formatDate(valeur, { day: "numeric", month: "short", year: "numeric" }) : "Ajouter"}
                      </span>
                    </button>
                  ))}
                </div>
                {calendrierOuvert && (
                  <div className="border-t border-gray-200 p-3">
                    <DateRangeCalendar checkIn={checkIn} checkOut={checkOut} onChange={choisirDates} indisponibles={indisponibles} chargement={dispoChargement} />
                  </div>
                )}
                <Stepper
                  className="border-t border-gray-200 px-4 py-3"
                  label="Voyageurs" hint={`${hebergement.max_guests} maximum`}
                  value={guests} min={1} max={hebergement.max_guests} onChange={setGuests}
                />
              </div>

              {datesPrises && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mb-3">
                  Ces dates ne sont plus disponibles.{" "}
                  <button type="button" onClick={() => { choisirDates("", ""); setCalendrierOuvert(true); }} className="font-bold underline">Choisir d&apos;autres dates</button>
                </p>
              )}

              {nights > 0 && !datesPrises && (
                <div className="space-y-3 py-4 border-t border-gray-100 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">{formatPrice(hebergement.price_per_night)} × {nights} nuit{nights > 1 ? "s" : ""}</span>
                    <span className="text-dark">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Frais de service (8 %)</span>
                    <span className="text-dark">{formatPrice(serviceFee)}</span>
                  </div>
                  <div className="flex justify-between font-heading font-bold pt-3 border-t border-gray-100 text-lg">
                    <span className="text-dark">Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              )}

              <button onClick={goBook} disabled={!canBook} className="w-full bg-primary text-white font-heading font-bold text-center py-4 rounded-xl hover:bg-primary-600 shadow-md transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isOwner ? "C'est votre hébergement" : !hebergement.is_available ? "Indisponible" : nights > 0 ? "Réserver" : "Sélectionnez des dates"}
              </button>
              <p className="text-center text-muted text-xs mt-3">Vous ne serez débité qu&apos;à l&apos;étape suivante.</p>
              {!isOwner && <div className="mt-4"><ProposerAuGroupe hebergementId={hebergement.id} /></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Barre de réservation mobile */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="min-w-0">
          <p className="font-heading font-bold text-dark truncate">{formatPrice(nights > 0 ? total : hebergement.price_per_night)}</p>
          <p className="text-xs text-muted">{nights > 0 ? `${nights} nuit${nights > 1 ? "s" : ""}, frais inclus` : "par nuit"}</p>
        </div>
        <button
          onClick={() => (canBook ? goBook() : document.getElementById("reserver")?.scrollIntoView({ behavior: "smooth" }))}
          disabled={isOwner}
          className="bg-primary text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex-shrink-0"
        >
          {isOwner ? "Votre annonce" : canBook ? "Réserver" : "Choisir les dates"}
        </button>
      </div>
    </div>
  );
}

export default function HebergementPage() {
  return (
    <Suspense>
      <HebergementContent />
    </Suspense>
  );
}
