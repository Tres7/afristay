"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, MapPin, CheckCircle, Clock, XCircle, User, CreditCard, Heart, Settings, HelpCircle, LogOut, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import api from "@/lib/api";

const tabs = [
  { id: "upcoming", label: "À venir" },
  { id: "past", label: "Passées" },
  { id: "cancelled", label: "Annulées" },
];

const profileLinks = [
  { href: "/profil/edit", label: "Mon profil", icon: User },
  { href: "/profil/reservations", label: "Mes réservations", icon: Calendar, active: true },
  { href: "/favoris", label: "Mes favoris", icon: Heart },
  { href: "/profil/paiement", label: "Paiement", icon: CreditCard },
  { href: "/profil/notifications", label: "Notifications", icon: Settings },
  { href: "/profil/aide", label: "Aide", icon: HelpCircle },
];

interface Reservation {
  id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled";
  reference: string;
  hebergement_detail: {
    id: string;
    name: string;
    city: string;
    location: string;
    image_url: string;
  };
}

function reservationTab(r: Reservation): "upcoming" | "past" | "cancelled" {
  if (r.status === "cancelled") return "cancelled";
  const today = new Date().toISOString().split("T")[0];
  return r.check_out >= today ? "upcoming" : "past";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface RecommendedHebergement {
  id: string;
  name: string;
  city: string;
  location: string;
  price_per_night: number;
  rating: number;
  image_url: string;
}

export default function ReservationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<RecommendedHebergement[]>([]);

  useEffect(() => {
    api.get("/v1/reservations/")
      .then((res) => setReservations(res.data.results))
      .finally(() => setLoading(false));

    api.get("/v1/hebergements/", { params: { sort: "note" } })
      .then((res) => setRecommended(res.data.results.slice(0, 3)))
      .catch(() => setRecommended([]));
  }, []);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await api.delete(`/v1/reservations/${id}/`);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r))
      );
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = reservations.filter((r) => reservationTab(r) === activeTab);
  const fullName = session?.user?.name ?? "Voyageur";
  const avatarSrc = session?.user?.image || `https://i.pravatar.cc/150?u=${session?.user?.email ?? "afristay"}`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

        {/* Left Sidebar */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 sticky top-28">
            {/* Avatar & Info */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-2 border-primary/20 mb-3">
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-heading font-bold text-dark text-lg">{fullName}</h3>
              <p className="text-gray-500 text-xs">Voyageur</p>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {profileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    link.active
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-50 hover:text-dark"
                  )}
                >
                  <link.icon size={18} />
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-10">
          <div>
            <h1 className="font-heading font-bold text-3xl text-dark mb-2">Mes réservations</h1>
            <p className="text-gray-500 text-sm">Gérez vos séjours à venir et consultez votre historique.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-3 text-sm font-bold transition-colors relative",
                  activeTab === tab.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-400 hover:text-dark"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reservation Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                <p className="text-gray-400 font-medium">Chargement...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                <p className="text-gray-400 font-medium">Aucune réservation dans cette catégorie.</p>
              </div>
            ) : (
              filtered.map((res) => {
                const h = res.hebergement_detail;
                const heroImage = h.image_url || "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=600&auto=format&fit=crop";
                return (
                  <div key={res.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-card transition-shadow">
                    {/* Image */}
                    <div className="w-full md:w-56 h-48 md:h-auto flex-shrink-0 relative">
                      <img src={heroImage} alt={h.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="font-heading font-bold text-lg text-dark">{h.name}</h3>
                            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                              <MapPin size={14} className="text-primary" />
                              <span>{h.location}, {h.city}</span>
                            </div>
                          </div>
                          {/* Status Badge */}
                          {res.status === "confirmed" && (
                            <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                              <CheckCircle size={12} /> Confirmée
                            </span>
                          )}
                          {res.status === "pending" && (
                            <span className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">
                              <Clock size={12} /> En attente
                            </span>
                          )}
                          {res.status === "cancelled" && (
                            <span className="flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
                              <XCircle size={12} /> Annulée
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-600 mt-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-primary" />
                            <span>{formatDate(res.check_in)} → {formatDate(res.check_out)}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <span>{res.guests_count} voyageur{res.guests_count > 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                        <div>
                          <span className="text-xs text-gray-500">Total</span>
                          <p className="font-heading font-bold text-lg text-dark">{Number(res.total_price).toLocaleString()} FCFA</p>
                        </div>
                        <div className="flex gap-3">
                          <Link href={`/reservation/confirmation/${res.id}`} className="px-5 py-2 bg-gray-100 text-dark text-sm font-medium rounded-full hover:bg-gray-200 transition-colors">
                            Détails
                          </Link>
                          {res.status === "confirmed" && (
                            <button
                              onClick={() => handleCancel(res.id)}
                              disabled={cancellingId === res.id}
                              className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary-600 transition-colors shadow-button disabled:opacity-60"
                            >
                              {cancellingId === res.id ? "Annulation..." : "Annuler"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recommandé pour votre prochain voyage */}
          {recommended.length > 0 && (
            <section className="pt-8">
              <h2 className="font-heading font-bold text-xl text-dark mb-6">Recommandé pour votre prochain voyage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {recommended.map((h) => {
                  const img = h.image_url || "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=600&auto=format&fit=crop";
                  return (
                    <Link key={h.id} href={`/hebergements/${h.id}`} className="group block">
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                        <img src={img} alt={h.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-dark text-sm">{h.name}</h3>
                        <div className="flex items-center gap-1 text-dark">
                          <Star size={10} className="fill-accent text-accent" />
                          <span className="text-xs font-bold">{h.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs">{h.location}, {h.city}</p>
                      <p className="mt-1 text-sm">
                        <span className="font-bold text-primary">{h.price_per_night.toLocaleString()} FCFA</span>
                        <span className="text-gray-400 text-xs"> / nuit</span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
