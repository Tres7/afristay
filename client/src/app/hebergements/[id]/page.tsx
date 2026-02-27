"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, MapPin, Star, ChevronDown, ChevronUp, Share2, Calendar, Users } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import AmenityBadge from "@/components/hebergement/AmenityBadge";
import { properties } from "@/lib/mockData";
import { calculateServiceFee } from "@/lib/utils";

export default function HebergementPage() {
  const params = useParams();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [nights] = useState(5);

  const property = properties.find((p) => p.id === params.id);

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Hébergement introuvable</p>
      </div>
    );
  }

  const subtotal = property.price * nights;
  const serviceFee = calculateServiceFee(subtotal);
  const total = subtotal + serviceFee;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-primary transition-colors">
            <ArrowLeft size={14} />
            Retour
          </button>
          <span>/</span>
          <span className="text-dark">{property.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Titre + actions */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading font-bold text-dark text-3xl">{property.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Star size={15} className="text-accent fill-accent" />
                <span className="text-dark font-semibold">{property.rating}</span>
                <span className="text-muted text-sm">({property.reviews} avis)</span>
              </div>
              <span className="text-muted">·</span>
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-muted" />
                <span className="text-muted text-sm">{property.location}, {property.city}, {property.country}</span>
              </div>
              <span className="text-muted">·</span>
              <span className="text-muted text-sm capitalize">{property.type} entier</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-2 border border-light rounded-xl px-4 py-2 text-sm text-dark hover:bg-light transition-colors">
              <Share2 size={15} />
              Partager
            </button>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex items-center gap-2 border border-light rounded-xl px-4 py-2 text-sm transition-colors hover:bg-light"
            >
              <Heart size={15} className={isFavorite ? "text-red-500 fill-red-500" : "text-dark"} />
              {isFavorite ? "Sauvegardé" : "Sauvegarder"}
            </button>
          </div>
        </div>

        {/* Galerie - Premium Layout */}
        <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[500px] rounded-3xl overflow-hidden mb-12 shadow-card">
          <div className="col-span-2 row-span-2 relative group cursor-pointer">
            <div className="absolute inset-0 bg-dark/20 z-10 group-hover:bg-transparent transition-colors duration-500"></div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?auto=format&fit=crop&q=80')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700"></div>
            <button className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md text-dark text-sm font-semibold px-4 py-2 rounded-xl shadow-sm hover:bg-white transition-colors flex items-center gap-2">
              <Star size={16} className="text-primary" /> Voir toutes les photos
            </button>
          </div>
          {[
            'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80'
          ].map((img, i) => (
            <div key={i} className="relative group cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-dark/20 z-10 group-hover:bg-transparent transition-colors duration-500"></div>
              <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{ backgroundImage: `url('${img}')` }}></div>
            </div>
          ))}
        </div>

        {/* Contenu principal — 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche */}
          <div className="lg:col-span-2 space-y-8">
            {/* Équipements */}
            <section className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Équipements</h2>
              <div className="flex flex-wrap gap-3">
                {property.amenities.map((amenity) => (
                  <AmenityBadge key={amenity} amenity={amenity} />
                ))}
              </div>
            </section>

            {/* Description */}
            <section className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Description</h2>
              <div className="text-muted leading-relaxed">
                <p>{expanded ? property.description : property.description.slice(0, 200) + "..."}</p>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-primary font-medium text-sm mt-3 hover:underline"
                >
                  {expanded ? <>Voir moins <ChevronUp size={14} /></> : <>Voir plus <ChevronDown size={14} /></>}
                </button>
              </div>
            </section>

            {/* Carte */}
            <section className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Localisation</h2>
              <div className="h-48 bg-light rounded-xl flex items-center justify-center">
                <span className="text-muted text-sm">🗺️ Carte interactive — {property.location}, {property.city}</span>
              </div>
            </section>
          </div>

          {/* Booking widget — colonne droite */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-soft border border-light p-8 sticky top-28">
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-dark font-heading font-bold text-4xl">{property.price} €</span>
                <span className="text-muted text-base font-medium">/ nuit</span>
              </div>

              {/* Dates */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <div className="px-5 py-4 hover:bg-light/50 transition-colors cursor-pointer">
                    <p className="text-[10px] text-dark font-bold uppercase tracking-widest mb-1.5">Arrivée</p>
                    <div className="flex items-center gap-2">
                      <p className="text-dark text-sm font-medium">15 jan. 2025</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 hover:bg-light/50 transition-colors cursor-pointer">
                    <p className="text-[10px] text-dark font-bold uppercase tracking-widest mb-1.5">Départ</p>
                    <div className="flex items-center gap-2">
                      <p className="text-dark text-sm font-medium">20 jan. 2025</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 px-5 py-4 hover:bg-light/50 transition-colors cursor-pointer flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-dark font-bold uppercase tracking-widest mb-1.5">Voyageurs</p>
                    <p className="text-dark text-sm font-medium">2 adultes</p>
                  </div>
                  <ChevronDown size={16} className="text-muted" />
                </div>
              </div>

              {/* Prix détaillé */}
              <div className="space-y-4 py-6 border-t border-light">
                <div className="flex justify-between text-base">
                  <span className="text-dark font-medium underline decoration-light underline-offset-4">{property.price} € × {nights} nuits</span>
                  <span className="text-dark">{subtotal} €</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-dark font-medium underline decoration-light underline-offset-4">Frais de service (8%)</span>
                  <span className="text-dark">{serviceFee} €</span>
                </div>
                <div className="flex justify-between font-heading font-bold pt-4 border-t border-light mt-2 text-xl">
                  <span className="text-dark">Total</span>
                  <span className="text-primary">{total} €</span>
                </div>
              </div>

              <a
                href={`/reservation/${property.id}`}
                className="block w-full bg-primary text-white font-heading font-bold text-center py-4 rounded-xl hover:bg-primary-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all mt-6"
              >
                Réserver
              </a>

              <p className="text-center text-muted text-xs mt-3">Aucun frais prélevé pour l&apos;instant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
