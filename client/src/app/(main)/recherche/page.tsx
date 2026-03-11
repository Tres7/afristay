"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Calendar, Users, Star, MapPin, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import api from "@/lib/api";

interface Hebergement {
  id: string;
  name: string;
  type: string;
  city: string;
  location: string;
  price_per_night: number;
  rating: number;
  image_url: string;
}

const filterOptions = [
  { id: "prix_asc", label: "Prix croissant" },
  { id: "prix_desc", label: "Prix décroissant" },
  { id: "note", label: "Meilleures notes" },
  { id: "hotel", label: "Hôtels" },
  { id: "villa", label: "Villas" },
  { id: "appartement", label: "Appartements" },
];

const TYPE_FILTERS = ["hotel", "villa", "appartement"];

function RechercheContent() {
  const searchParams = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const [results, setResults] = useState<Hebergement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchHebergements = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string> = {};
      if (destination) params.city = destination;
      if (priceMin) params.price_min = priceMin;
      if (priceMax) params.price_max = priceMax;
      if (activeFilter && TYPE_FILTERS.includes(activeFilter)) params.type = activeFilter;
      if (activeFilter && !TYPE_FILTERS.includes(activeFilter)) params.sort = activeFilter;

      const res = await api.get("/v1/hebergements/", { params });
      setResults(res.data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    fetchHebergements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch quand le filtre change
  useEffect(() => {
    if (searched) fetchHebergements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  return (
    <div className="min-h-screen bg-light">
      {/* Barre de recherche */}
      <div className="bg-white border-b border-light shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 items-center">
            <div className="flex-1 flex items-center gap-3 border border-light rounded-xl px-4 py-3 bg-light">
              <Search size={16} className="text-muted flex-shrink-0" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchHebergements()}
                placeholder="Destination (ex: Lomé, Accra, Abidjan…)"
                className="flex-1 text-sm text-dark placeholder:text-muted outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 border border-light rounded-xl px-4 py-3 bg-light">
              <Calendar size={16} className="text-muted flex-shrink-0" />
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="text-sm text-dark outline-none bg-transparent w-32"
              />
            </div>
            <div className="flex items-center gap-2 border border-light rounded-xl px-4 py-3 bg-light">
              <Calendar size={16} className="text-muted flex-shrink-0" />
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="text-sm text-dark outline-none bg-transparent w-32"
              />
            </div>
            <div className="flex items-center gap-2 border border-light rounded-xl px-4 py-3 bg-light">
              <Users size={16} className="text-muted flex-shrink-0" />
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="text-sm text-dark outline-none bg-transparent"
              >
                {["1", "2", "3", "4", "5+"].map((n) => (
                  <option key={n} value={n}>{n} adulte{n !== "1" ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchHebergements}
              className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 font-medium text-sm hover:bg-primary-700 transition-colors flex-shrink-0"
            >
              <Search size={16} />
              Rechercher
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-8">
          {/* Sidebar filtres */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal size={16} className="text-primary" />
                <h3 className="font-heading font-semibold text-dark">Filtres</h3>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">Trier par</p>
                {filterOptions.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors",
                      activeFilter === f.id
                        ? "bg-primary text-white"
                        : "text-dark hover:bg-light"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-light">
                <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Prix par nuit (FCFA)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full border border-light rounded-lg px-3 py-2 text-sm text-dark outline-none"
                  />
                  <span className="text-muted">—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full border border-light rounded-lg px-3 py-2 text-sm text-dark outline-none"
                  />
                </div>
                <button
                  onClick={fetchHebergements}
                  className="mt-3 w-full bg-primary text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </aside>

          {/* Résultats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              {loading ? (
                <p className="text-muted text-sm">Recherche en cours...</p>
              ) : (
                <p className="text-dark font-medium">
                  <span className="font-heading font-bold text-2xl text-dark">{results.length}</span>
                  {" "}hébergement{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
                  {destination && (
                    <span className="text-muted font-normal text-base"> à {destination}</span>
                  )}
                </p>
              )}
            </div>

            {!loading && results.length === 0 && searched ? (
              <motion.div
                className="bg-white rounded-2xl shadow-card p-16 text-center border border-light/50"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Search size={28} className="text-primary" />
                </div>
                <p className="text-dark font-heading font-semibold text-xl mb-2">Aucun résultat trouvé</p>
                <p className="text-muted text-base">Essayez une autre destination ou ajustez vos critères.</p>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
              >
                {results.map((h) => (
                  <motion.div
                    key={h.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                    }}
                  >
                    <Link
                      href={`/hebergements/${h.id}`}
                      className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden block"
                    >
                      <div className="h-56 bg-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                          style={{
                            backgroundImage: h.image_url
                              ? `url(${h.image_url})`
                              : "url(https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?auto=format&fit=crop&q=80)",
                          }}
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm z-20">
                          <Star size={12} className="text-accent fill-accent" />
                          <span className="text-dark text-xs font-bold">{h.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading font-semibold text-dark text-sm truncate">{h.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={11} className="text-muted flex-shrink-0" />
                          <span className="text-muted text-xs truncate">{h.location}, {h.city}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-light">
                          <div>
                            <span className="text-primary font-heading font-bold text-lg">{h.price_per_night.toLocaleString()} FCFA</span>
                            <span className="text-muted text-xs ml-1">/nuit</span>
                          </div>
                          <span className="text-xs text-muted capitalize bg-light px-2.5 py-1 rounded-full">{h.type}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    }>
      <RechercheContent />
    </Suspense>
  );
}
