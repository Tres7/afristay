"use client";

import { useState } from "react";
import { Star, MapPin, Search, ChevronDown, Heart } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "activites", label: "Activités" },
  { id: "restaurants", label: "Restaurants" },
  { id: "loisirs", label: "Loisirs" },
  { id: "sites", label: "Sites touristiques" },
];

const mockActivities = [
  {
    id: 1,
    name: "Safari au Parc National",
    type: "Aventure",
    city: "Serengeti",
    country: "Tanzanie",
    price: "150 000 XOF",
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=600&auto=format&fit=crop",
    badgeColor: "bg-orange-500",
  },
  {
    id: 2,
    name: "Dîner sur la Plage",
    type: "Gastronomie",
    city: "Zanzibar",
    country: "Tanzanie",
    price: "45 000 XOF",
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=600&auto=format&fit=crop",
    badgeColor: "bg-green-500",
  },
  {
    id: 3,
    name: "Visite du Musée des Civilisations",
    type: "Culture",
    city: "Abidjan",
    country: "Côte d'Ivoire",
    price: "15 000 XOF",
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1518544806871-3316f7376cff?q=80&w=600&auto=format&fit=crop",
    badgeColor: "bg-blue-500",
  },
  {
    id: 4,
    name: "Balade en Dromadaire",
    type: "Aventure",
    city: "Marrakech",
    country: "Maroc",
    price: "30 000 XOF",
    rating: 4.6,
    img: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=600&auto=format&fit=crop",
    badgeColor: "bg-orange-500",
  },
  {
    id: 5,
    name: "Trekking Mont Toubkal",
    type: "Aventure",
    city: "Imlil",
    country: "Maroc",
    price: "85 000 XOF",
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
    badgeColor: "bg-orange-500",
  },
  {
    id: 6,
    name: "Cours de Cuisine Locale",
    type: "Gastronomie",
    city: "Dakar",
    country: "Sénégal",
    price: "25 000 XOF",
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=600&auto=format&fit=crop",
    badgeColor: "bg-green-500",
  },
];

export default function DecouvrirPage() {
  const [activeTab, setActiveTab] = useState("activites");

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl text-dark mb-6">
            Découvrez l'Afrique autrement
          </h1>

          {/* Onglets */}
          <div className="flex gap-8 overflow-x-auto no-scrollbar border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-4 text-[15px] font-bold transition-colors whitespace-nowrap relative",
                  activeTab === tab.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-400 hover:text-dark"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-10 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col px-4 py-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-[11px] font-bold text-dark uppercase tracking-wide">Ville</span>
              <div className="flex items-center justify-between mt-1 text-sm font-medium text-gray-500">
                Toutes les villes <ChevronDown size={14} />
              </div>
            </div>
            <div className="flex flex-col px-4 py-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-[11px] font-bold text-dark uppercase tracking-wide">Catégorie</span>
              <div className="flex items-center justify-between mt-1 text-sm font-medium text-gray-500">
                Toutes les catégories <ChevronDown size={14} />
              </div>
            </div>
            <div className="flex flex-col px-4 py-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-[11px] font-bold text-dark uppercase tracking-wide">Prix</span>
              <div className="flex items-center justify-between mt-1 text-sm font-medium text-gray-500">
                Tous les prix <ChevronDown size={14} />
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-auto relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher une activité..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium text-dark outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Grid Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockActivities.map((activity) => (
            <div
              key={activity.id}
              className="group cursor-pointer block"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-4">
                <img
                  src={activity.img}
                  alt={activity.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Category Badge */}
                <div className={cn(
                  "absolute top-4 left-4 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full text-white shadow-sm",
                  activity.badgeColor
                )}>
                  {activity.type}
                </div>

                {/* Favorite Button */}
                <button className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-colors">
                  <Heart size={16} />
                </button>
              </div>

              {/* Info Container */}
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-heading font-bold text-dark text-[16px] leading-tight">
                    {activity.name}
                  </h3>
                  <div className="flex items-center gap-1 text-dark shrink-0">
                    <Star size={12} className="fill-accent text-accent" />
                    <span className="text-sm font-bold">{activity.rating}</span>
                  </div>
                </div>
                
                <p className="text-gray-500 text-sm">{activity.city}, {activity.country}</p>
                
                <p className="mt-2 text-[15px]">
                  <span className="font-bold text-primary">{activity.price}</span>
                  <span className="text-gray-400 text-sm"> / pers.</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
