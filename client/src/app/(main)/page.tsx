"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import { Search, MapPin, ChevronRight, CreditCard, MessageCircle, Zap, RotateCcw, Building2, Home, Hotel, Tent } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import DateRangeField from "@/components/ui/DateRangeField";
import GuestsField from "@/components/ui/GuestsField";
import PropertyCard from "@/components/hebergement/PropertyCard";
import type { City, Hebergement, Paginated } from "@/types/api/models";

const heroImages = [
  "/backgrounghome.jpg",
  "/backgrounghome1.jpg",
  "/backgroundhome2.jpg",
  "/backgroundhome3.jpg",
  "/backgroundhome4.jpg",
];

const CATEGORIES = [
  { type: "hotel", label: "Hôtels", icon: Hotel, color: "bg-blue-100 text-blue-600" },
  { type: "appartement", label: "Appartements", icon: Building2, color: "bg-green-100 text-green-600" },
  { type: "villa", label: "Villas", icon: Home, color: "bg-purple-100 text-purple-600" },
  { type: "auberge", label: "Auberges", icon: Tent, color: "bg-amber-100 text-amber-600" },
];

const FEATURES = [
  { title: "Paiement flexible", desc: "Mobile Money (MTN, Orange, Wave), carte bancaire ou PayPal.", icon: CreditCard, color: "text-orange-500 bg-orange-100" },
  { title: "Réservation instantanée", desc: "Votre séjour est confirmé immédiatement, sans attente.", icon: Zap, color: "text-blue-500 bg-blue-100" },
  { title: "Contact direct avec l'hôte", desc: "Posez vos questions avant et pendant votre séjour.", icon: MessageCircle, color: "text-green-500 bg-green-100" },
  { title: "Annulation simple", desc: "Annulez en un clic depuis votre espace réservations.", icon: RotateCcw, color: "text-purple-500 bg-purple-100" },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function HeroSearch() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (checkIn && checkOut) {
      params.set("check_in", checkIn);
      params.set("check_out", checkOut);
    }
    params.set("guests", String(guests));
    router.push(`/recherche?${params.toString()}`);
  };

  const fieldClass = "flex-1 px-5 py-3 w-full text-left min-w-0";
  const labelClass = "block text-[11px] font-bold text-dark uppercase tracking-wide";
  const inputClass = "w-full text-base md:text-sm font-medium text-dark outline-none bg-transparent placeholder:text-gray-400";

  return (
    <form
      onSubmit={submit}
      className="animate-fade-up-delay-2 bg-white rounded-3xl md:rounded-full p-2 max-w-4xl mx-auto shadow-card flex flex-col md:flex-row md:items-center divide-y md:divide-y-0 md:divide-x divide-gray-100"
    >
      <label className={fieldClass}>
        <span className={labelClass}>Destination</span>
        <span className="flex items-center gap-2 mt-1">
          <MapPin size={16} className="text-primary flex-shrink-0" />
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Où allez-vous ?" className={inputClass} />
        </span>
      </label>
      <DateRangeField
        variant="hero" checkIn={checkIn} checkOut={checkOut}
        onChange={(a, d) => { setCheckIn(a); setCheckOut(d); }}
        className="md:flex-[1.6] min-w-0"
      />
      <div className="flex items-center justify-between gap-3 pl-5 pr-2 py-2 md:py-0 w-full md:w-auto md:flex-1">
        <div className="min-w-0 flex-1 text-left">
          <span className={labelClass}>Voyageurs</span>
          <GuestsField variant="bare" value={guests} onChange={setGuests} className="mt-1" />
        </div>
        <button type="submit" className="bg-primary hover:bg-primary-600 text-white p-4 rounded-full transition-colors flex items-center gap-2 font-bold text-sm shadow-md flex-shrink-0" aria-label="Rechercher">
          <Search size={18} />
          <span className="hidden lg:inline">Rechercher</span>
        </button>
      </div>
    </form>
  );
}

function WelcomeToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("bienvenue") === "1") {
      toast.success("Bienvenue sur AfriStay ! Votre compte est vérifié.");
      router.replace("/");
    }
  }, [searchParams, router]);
  return null;
}

export default function HomePage() {
  const [currentBg, setCurrentBg] = useState(0);
  const { status } = useSession();

  useEffect(() => {
    const interval = setInterval(() => setCurrentBg((prev) => (prev + 1) % heroImages.length), 12000);
    return () => clearInterval(interval);
  }, []);

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["villes"],
    queryFn: async () => (await api.get<{ results: City[] }>("/v1/hebergements/villes/")).data.results,
  });

  const { data: recommended = [], isLoading: recoLoading } = useQuery({
    queryKey: ["hebergements", "recommandes", status],
    queryFn: async () => (await api.get<Paginated<Hebergement>>("/v1/hebergements/", { params: { sort: "note", limit: 8 } })).data.results,
    enabled: status !== "loading",
  });

  return (
    <div className="bg-white min-h-screen">
      <Suspense><WelcomeToast /></Suspense>

      <section className="relative pt-16 pb-36 md:pt-28 md:pb-48 px-4 sm:px-6 text-white min-h-[560px] md:min-h-[620px] flex items-center justify-center overflow-hidden">
        {heroImages.map((img, i) => (
          <div
            key={img}
            className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${i === currentBg ? "animate-ken-burns" : ""}`}
            style={{ backgroundImage: `url('${img}')`, opacity: i === currentBg ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 z-[1] bg-dark/45" />
        <div className="absolute bottom-0 left-0 right-0 h-40 md:h-52 bg-gradient-to-b from-transparent to-white z-[2]" />

        <div className="w-full max-w-5xl mx-auto text-center relative z-10">
          <h1 className="animate-fade-up font-heading font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-4 drop-shadow-md">
            Découvrez l&apos;Afrique<br />autrement
          </h1>
          <p className="animate-fade-up-delay-1 text-white/90 text-base sm:text-lg md:text-xl mb-8 md:mb-12 max-w-2xl mx-auto font-medium drop-shadow">
            Réservez des hébergements uniques et vivez des expériences authentiques.
          </p>
          <HeroSearch />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-16 md:space-y-20 -mt-16 md:-mt-20 relative z-20">
        <section>
          <div className="flex items-end justify-between mb-6 md:mb-8 gap-4">
            <div>
              <h2 className="font-heading font-bold text-dark text-2xl md:text-3xl">Destinations populaires</h2>
              <p className="text-gray-500 text-sm mt-1">Les villes où nos voyageurs posent leurs valises</p>
            </div>
            <Link href="/recherche" className="flex items-center gap-1 text-primary text-sm font-bold hover:underline flex-shrink-0">
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>
          {citiesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-44 md:h-64 rounded-[2rem] skeleton" />)}
            </div>
          ) : (
            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6" variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
              {cities.slice(0, 4).map((dest) => (
                <motion.div key={dest.city} variants={cardVariants}>
                  <Link href={`/recherche?city=${encodeURIComponent(dest.city)}`} className="block relative h-44 md:h-64 rounded-[2rem] overflow-hidden group shadow-sm bg-slate-200">
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('${dest.image_url}')` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
                      <h3 className="text-white font-heading font-bold text-base md:text-lg leading-tight">{dest.city}</h3>
                      <p className="text-white/80 text-xs mt-1 font-medium">
                        {dest.count} hébergement{dest.count > 1 ? "s" : ""} · dès {formatPrice(dest.min_price)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <section className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 md:gap-4" aria-label="Types d'hébergement">
          {CATEGORIES.map(({ type, label, icon: Icon, color }) => (
            <Link
              key={type}
              href={`/recherche?type=${type}`}
              className="bg-white px-4 md:px-6 py-3 md:py-4 rounded-full border border-gray-100 shadow-sm flex items-center gap-3 hover:border-primary/40 hover:shadow transition-all"
            >
              <span className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}><Icon size={16} /></span>
              <span className="font-bold text-dark text-sm">{label}</span>
            </Link>
          ))}
        </section>

        <section>
          <div className="flex items-end justify-between mb-6 md:mb-8 gap-4">
            <h2 className="font-heading font-bold text-dark text-2xl md:text-3xl">Les mieux notés</h2>
            <Link href="/recherche?sort=note" className="flex items-center gap-1 text-primary text-sm font-bold hover:underline flex-shrink-0">
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>
          {recoLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-72 rounded-2xl skeleton" />)}
            </div>
          ) : recommended.length === 0 ? (
            <p className="text-gray-500 bg-light-muted rounded-2xl p-8 text-center">Aucun hébergement publié pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommended.map((prop) => <PropertyCard key={prop.id} property={prop} />)}
            </div>
          )}
        </section>

        <section className="py-12 bg-orange-50/60 rounded-[2rem] md:rounded-[3rem] px-6 md:px-8 text-center">
          <h2 className="font-heading font-bold text-dark text-2xl md:text-3xl mb-3">Pourquoi choisir AfriStay ?</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm mb-10 md:mb-16">
            Nous rendons votre voyage en Afrique aussi simple et serein que possible.
          </p>
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8" variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
            {FEATURES.map((feat) => (
              <motion.div key={feat.title} variants={cardVariants} className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-sm ${feat.color}`}>
                  <feat.icon size={26} strokeWidth={2} />
                </div>
                <h3 className="font-bold text-dark text-lg mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-[240px]">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>

      <section className="bg-primary py-14 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="text-white max-w-xl">
            <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">Devenez hôte AfriStay</h2>
            <p className="text-white/90 text-sm md:text-base leading-relaxed">
              Gagnez un revenu complémentaire en partageant votre logement et faites découvrir votre région.
            </p>
          </div>
          <Link href="/hote" className="bg-white text-primary hover:bg-gray-50 px-8 py-4 rounded-full font-bold transition-colors shadow-lg flex-shrink-0">
            Commencer maintenant
          </Link>
        </div>
      </section>
    </div>
  );
}
