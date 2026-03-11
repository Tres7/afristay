"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, MapPin, Star, ChevronDown, ChevronUp, Share2, Calendar, Users } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import AmenityBadge from "@/components/hebergement/AmenityBadge";
import { calculateServiceFee } from "@/lib/utils";
import api from "@/lib/api";

interface Hebergement {
  id: string;
  name: string;
  description: string;
  type: string;
  city: string;
  location: string;
  price_per_night: number;
  rating: number;
  review_count: number;
  image_url: string;
  amenities: string[];
}

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export default function HebergementPage() {
  const params = useParams();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const defaultOut = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(defaultOut);
  const [guests, setGuests] = useState("2");

  const [hebergement, setHebergement] = useState<Hebergement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/v1/hebergements/${params.id}/`)
      .then((res) => setHebergement(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  if (notFound || !hebergement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Hébergement introuvable</p>
      </div>
    );
  }

  const nights = calculateNights(checkIn, checkOut);
  const subtotal = hebergement.price_per_night * nights;
  const serviceFee = calculateServiceFee(subtotal);
  const total = subtotal + serviceFee;
  const heroImage = hebergement.image_url || "https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?auto=format&fit=crop&q=80";
  const reservationUrl = `/reservation/${hebergement.id}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-primary transition-colors">
            <ArrowLeft size={14} />
            Retour
          </button>
          <span>/</span>
          <span className="text-dark">{hebergement.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading font-bold text-dark text-3xl">{hebergement.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Star size={15} className="text-accent fill-accent" />
                <span className="text-dark font-semibold">{hebergement.rating.toFixed(1)}</span>
                <span className="text-muted text-sm">({hebergement.review_count} avis)</span>
              </div>
              <span className="text-muted">·</span>
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-muted" />
                <span className="text-muted text-sm">{hebergement.location}, {hebergement.city}</span>
              </div>
              <span className="text-muted">·</span>
              <span className="text-muted text-sm capitalize">{hebergement.type} entier</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-2 border border-light rounded-xl px-4 py-2 text-sm text-dark hover:bg-light transition-colors">
              <Share2 size={15} />Partager
            </button>
            <button onClick={() => setIsFavorite(!isFavorite)} className="flex items-center gap-2 border border-light rounded-xl px-4 py-2 text-sm transition-colors hover:bg-light">
              <Heart size={15} className={isFavorite ? "text-red-500 fill-red-500" : "text-dark"} />
              {isFavorite ? "Sauvegardé" : "Sauvegarder"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[500px] rounded-3xl overflow-hidden mb-12 shadow-card">
          <div className="col-span-2 row-span-2 relative group cursor-pointer">
            <div className="absolute inset-0 bg-dark/20 z-10 group-hover:bg-transparent transition-colors duration-500" />
            <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url('${heroImage}')` }} />
          </div>
          {[
            "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80",
          ].map((img, i) => (
            <div key={i} className="relative group cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-dark/20 z-10 group-hover:bg-transparent transition-colors duration-500" />
              <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{ backgroundImage: `url('${img}')` }} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Équipements</h2>
              {hebergement.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {hebergement.amenities.map((a) => <AmenityBadge key={a} amenity={a} />)}
                </div>
              ) : (
                <p className="text-muted text-sm">Aucun équipement renseigné.</p>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Description</h2>
              <div className="text-muted leading-relaxed">
                <motion.div animate={{ height: expanded ? "auto" : "4.5rem" }} transition={{ duration: 0.35, ease: "easeInOut" }} className="overflow-hidden" style={{ height: "4.5rem" }}>
                  <p>{hebergement.description || "Aucune description disponible."}</p>
                </motion.div>
                <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-primary font-medium text-sm mt-3 hover:underline">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={expanded ? "moins" : "plus"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1">
                      {expanded ? (<>Voir moins <ChevronUp size={14} /></>) : (<>Voir plus <ChevronDown size={14} /></>)}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Localisation</h2>
              <div className="h-48 bg-light rounded-xl flex items-center justify-center">
                <span className="text-muted text-sm">Carte: {hebergement.location}, {hebergement.city}</span>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-soft border border-light p-8 sticky top-28">
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-dark font-heading font-bold text-4xl">{hebergement.price_per_night.toLocaleString()}</span>
                <span className="text-muted text-base font-medium">FCFA / nuit</span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-dark font-bold uppercase tracking-widest mb-1.5"><Calendar size={10} className="inline mr-1" />Arrivée</p>
                    <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className="text-dark text-sm font-medium outline-none w-full bg-transparent" />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-dark font-bold uppercase tracking-widest mb-1.5"><Calendar size={10} className="inline mr-1" />Départ</p>
                    <input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} className="text-dark text-sm font-medium outline-none w-full bg-transparent" />
                  </div>
                </div>
                <div className="border-t border-gray-200 px-4 py-3">
                  <p className="text-[10px] text-dark font-bold uppercase tracking-widest mb-1"><Users size={10} className="inline mr-1" />Voyageurs</p>
                  <select value={guests} onChange={(e) => setGuests(e.target.value)} className="text-dark text-sm font-medium outline-none bg-transparent">
                    {["1","2","3","4","5","6+"].map((n) => (
                      <option key={n} value={n}>{n} adulte{n !== "1" ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              {nights > 0 && (
                <div className="space-y-3 py-4 border-t border-light text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark">{hebergement.price_per_night.toLocaleString()} × {nights} nuit{nights > 1 ? "s" : ""}</span>
                    <span className="text-dark">{subtotal.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark">Frais de service (8%)</span>
                    <span className="text-dark">{serviceFee.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between font-heading font-bold pt-3 border-t border-light text-lg">
                    <span className="text-dark">Total</span>
                    <span className="text-primary">{total.toLocaleString()} FCFA</span>
                  </div>
                </div>
              )}

              <a href={nights > 0 ? reservationUrl : "#"} className="block w-full bg-primary text-white font-heading font-bold text-center py-4 rounded-xl hover:bg-primary-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all mt-4">
                {nights > 0 ? "Réserver" : "Sélectionnez des dates"}
              </a>
              <p className="text-center text-muted text-xs mt-3">Aucun frais prélevé pour l&apos;instant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
