"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, CheckCircle, Clock, XCircle, User, CreditCard, Heart, Settings, HelpCircle, LogOut, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

const reservations = [
  {
    id: "RES-AF2024-001",
    propertyName: "Villa Hibiscus",
    location: "Assinie, Côte d'Ivoire",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=600&auto=format&fit=crop",
    checkIn: "15 Mai 2025",
    checkOut: "20 Mai 2025",
    guests: 4,
    status: "confirmed",
    price: "125 000 XOF",
    tab: "upcoming",
  },
  {
    id: "RES-AF2024-002",
    propertyName: "Riad Jasmin",
    location: "Marrakech, Maroc",
    image: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=600&auto=format&fit=crop",
    checkIn: "1 Juin 2025",
    checkOut: "7 Juin 2025",
    guests: 2,
    status: "pending",
    price: "85 000 XOF",
    tab: "upcoming",
  },
  {
    id: "RES-AF2024-003",
    propertyName: "Serengeti Lodge",
    location: "Serengeti, Tanzanie",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=600&auto=format&fit=crop",
    checkIn: "10 Fév 2025",
    checkOut: "17 Fév 2025",
    guests: 2,
    status: "completed",
    price: "250 000 XOF",
    tab: "past",
  },
];

const recommended = [
  { id: 1, name: "Loft Plateau", loc: "Dakar, Sénégal", price: "60 000 XOF", rating: "4.7", img: "https://images.unsplash.com/photo-1502672260266-1c1e55240c5f?q=80&w=400&auto=format&fit=crop" },
  { id: 2, name: "Suite Océan", loc: "Cap Skirring", price: "90 000 XOF", rating: "4.8", img: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=400&auto=format&fit=crop" },
  { id: 3, name: "Maison de Pierre", loc: "Kigali, Rwanda", price: "55 000 XOF", rating: "4.9", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=400&auto=format&fit=crop" },
];

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");

  const filtered = reservations.filter((r) => r.tab === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

        {/* Left Sidebar */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 sticky top-28">
            {/* Avatar & Info */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-2 border-primary/20 mb-3">
                <img src="https://i.pravatar.cc/150?u=afristay" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-heading font-bold text-dark text-lg">Jean Dupont</h3>
              <p className="text-gray-500 text-xs">Voyageur depuis 2024</p>
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
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full">
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
            {filtered.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                <p className="text-gray-400 font-medium">Aucune réservation dans cette catégorie.</p>
              </div>
            ) : (
              filtered.map((res) => (
                <div key={res.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-card transition-shadow">
                  {/* Image */}
                  <div className="w-full md:w-56 h-48 md:h-auto flex-shrink-0 relative">
                    <img src={res.image} alt={res.propertyName} className="w-full h-full object-cover" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-heading font-bold text-lg text-dark">{res.propertyName}</h3>
                          <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                            <MapPin size={14} className="text-primary" />
                            <span>{res.location}</span>
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
                        {res.status === "completed" && (
                          <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                            <CheckCircle size={12} /> Terminée
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mt-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-primary" />
                          <span>{res.checkIn} → {res.checkOut}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span>{res.guests} voyageurs</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-xs text-gray-500">Total</span>
                        <p className="font-heading font-bold text-lg text-dark">{res.price}</p>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-5 py-2 bg-gray-100 text-dark text-sm font-medium rounded-full hover:bg-gray-200 transition-colors">
                          Détails
                        </button>
                        {res.status === "confirmed" && (
                          <button className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary-600 transition-colors shadow-button">
                            Gérer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recommandé pour votre prochain voyage */}
          <section className="pt-8">
            <h2 className="font-heading font-bold text-xl text-dark mb-6">Recommandé pour votre prochain voyage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {recommended.map((prop) => (
                <Link key={prop.id} href={`/hebergements/${prop.id}`} className="group block">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                    <img src={prop.img} alt={prop.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-dark text-sm">{prop.name}</h3>
                    <div className="flex items-center gap-1 text-dark">
                      <Star size={10} className="fill-accent text-accent" />
                      <span className="text-xs font-bold">{prop.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs">{prop.loc}</p>
                  <p className="mt-1 text-sm">
                    <span className="font-bold text-primary">{prop.price}</span>
                    <span className="text-gray-400 text-xs"> / nuit</span>
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
