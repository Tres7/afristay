"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { CheckCircle, Calendar, MapPin, Users, Star, ArrowRight } from "lucide-react";

const recommendedActivities = [
  { id: 1, name: "Excursion en pirogue", loc: "Lagune d'Assinie", price: "25 000 XOF", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=400&auto=format&fit=crop" },
  { id: 2, name: "Cours de surf", loc: "Plage de Grand-Bassam", price: "15 000 XOF", img: "https://images.unsplash.com/photo-1502680390548-bdbac40b06ca?q=80&w=400&auto=format&fit=crop" },
  { id: 3, name: "Visite du marché local", loc: "Marché d'Assinie", price: "Gratuit", img: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=400&auto=format&fit=crop" },
];

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Success Header */}
        <div className="text-center mb-12">
          <img src="/logo.png" alt="AfriStay" className="h-12 w-auto object-contain mx-auto mb-6" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="font-heading font-bold text-dark text-3xl md:text-4xl mb-3">
            Réservation confirmée !
          </h1>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Votre séjour est réservé. Un email de confirmation a été envoyé à <span className="font-medium text-dark">jean@email.com</span>.
          </p>
        </div>

        {/* Reservation Details Card */}
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 mb-12">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Property Image */}
            <div className="w-full md:w-48 h-40 md:h-auto rounded-2xl overflow-hidden flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=600&auto=format&fit=crop"
                alt="Villa Hibiscus"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-heading font-bold text-dark text-xl">Villa Hibiscus</h2>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                    <MapPin size={14} className="text-primary" />
                    Assinie, Côte d&apos;Ivoire
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  Confirmée
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dates</p>
                    <p className="text-sm font-bold text-dark">15 – 20 Mai</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Voyageurs</p>
                    <p className="text-sm font-bold text-dark">3 personnes</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total payé</p>
                  <p className="text-lg font-heading font-bold text-primary">675 000 XOF</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">Numéro de réservation</p>
                <p className="text-sm font-mono font-bold text-dark">RES-AF2025-4821</p>
              </div>
            </div>
          </div>
        </div>

        {/* Préparez votre séjour */}
        <section>
          <h2 className="font-heading font-bold text-dark text-xl mb-6">
            Préparez votre séjour à Assinie
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {recommendedActivities.map((act) => (
              <div key={act.id} className="group cursor-pointer">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                  <img src={act.img} alt={act.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <h3 className="font-bold text-dark text-sm">{act.name}</h3>
                <p className="text-gray-500 text-xs">{act.loc}</p>
                <p className="text-sm mt-1">
                  <span className="font-bold text-primary">{act.price}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link
            href="/profil/reservations"
            className="bg-primary text-white font-bold px-8 py-4 rounded-full text-center shadow-button hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            Voir mes réservations <ArrowRight size={16} />
          </Link>
          <Link
            href="/"
            className="bg-white border border-gray-200 text-dark font-bold px-8 py-4 rounded-full text-center hover:bg-gray-50 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </div>
  );
}
