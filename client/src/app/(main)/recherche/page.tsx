"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Calendar, Users, Star, MapPin, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { properties } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const filterOptions = [
  { id: "prix_asc", label: "Prix croissant" },
  { id: "prix_desc", label: "Prix décroissant" },
  { id: "note", label: "Meilleures notes" },
  { id: "hotel", label: "Hôtels" },
  { id: "villa", label: "Villas" },
  { id: "appartement", label: "Appartements" },
];

function RechercheContent() {
  const searchParams = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = properties.filter((p) =>
    destination
      ? p.city.toLowerCase().includes(destination.toLowerCase()) ||
        p.name.toLowerCase().includes(destination.toLowerCase())
      : true
  );

  const sorted = [...filtered].sort((a, b) => {
    if (activeFilter === "prix_asc") return a.price - b.price;
    if (activeFilter === "prix_desc") return b.price - a.price;
    if (activeFilter === "note") return b.rating - a.rating;
    return 0;
  }).filter((p) => {
    if (activeFilter === "hotel") return p.type === "hotel";
    if (activeFilter === "villa") return p.type === "villa";
    if (activeFilter === "appartement") return p.type === "appartement";
    return true;
  });

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
            <button className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 font-medium text-sm hover:bg-primary-700 transition-colors flex-shrink-0">
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
                <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Prix par nuit</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full border border-light rounded-lg px-3 py-2 text-sm text-dark outline-none"
                  />
                  <span className="text-muted">—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full border border-light rounded-lg px-3 py-2 text-sm text-dark outline-none"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Résultats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <p className="text-dark font-medium">
                <span className="font-heading font-bold text-2xl text-dark">{sorted.length}</span>
                {" "}hébergement{sorted.length > 1 ? "s" : ""} trouvé{sorted.length > 1 ? "s" : ""}
                {destination && (
                  <span className="text-muted font-normal text-base"> à {destination}</span>
                )}
              </p>
            </div>

            {sorted.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-card p-16 text-center border border-light/50">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Search size={28} className="text-primary" />
                </div>
                <p className="text-dark font-heading font-semibold text-xl mb-2">Aucun résultat trouvé</p>
                <p className="text-muted text-base">Essayez une autre destination ou ajustez vos critères de recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {sorted.map((property) => (
                  <Link
                    key={property.id}
                    href={`/hebergements/${property.id}`}
                    className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden"
                  >
                    <div className="h-56 bg-slate-100 relative group-hover:scale-105 transition-transform duration-500">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-primary/20 bg-[url('https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-50"></div>
                      
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm z-20">
                        <Star size={12} className="text-accent fill-accent" />
                        <span className="text-dark text-xs font-bold">{property.rating}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading font-semibold text-dark text-sm truncate">{property.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={11} className="text-muted flex-shrink-0" />
                        <span className="text-muted text-xs truncate">{property.location}, {property.city}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-light">
                        <div>
                          <span className="text-primary font-heading font-bold text-lg">{property.price} €</span>
                          <span className="text-muted text-xs ml-1">/nuit</span>
                        </div>
                        <span className="text-xs text-muted capitalize bg-light px-2.5 py-1 rounded-full">{property.type}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
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
