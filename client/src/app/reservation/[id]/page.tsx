"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Shield, Smartphone, CreditCard, Wallet, MapPin, Calendar, Users, AlertCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

const paymentMethods = [
  { id: "mobile_money", label: "Mobile Money", sublabel: "MTN, Orange, Wave", icon: Smartphone },
  { id: "carte", label: "Carte bancaire", sublabel: "Visa, Mastercard", icon: CreditCard },
  { id: "paypal", label: "PayPal", sublabel: "Compte PayPal", icon: Wallet },
];

export default function ReservationPage() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");

  // Mock property data
  const property = {
    name: "Villa Hibiscus",
    location: "Assinie, Côte d'Ivoire",
    img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=600&auto=format&fit=crop",
    rating: "4.8",
    pricePerNight: "125 000",
    currency: "XOF",
  };

  const nights = 5;
  const subtotal = "625 000";
  const serviceFee = "50 000";
  const total = "675 000";

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-dark hover:text-primary transition-colors">
            <ArrowLeft size={20} />
          </button>
          <img src="/logo.png" alt="AfriStay" className="h-7 w-auto object-contain" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
          <h1 className="font-heading font-bold text-dark text-xl">Confirmer et payer</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Left Column */}
          <div className="lg:col-span-3 space-y-8">

            {/* Votre voyage */}
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-6">Votre voyage</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-dark text-sm">Dates</p>
                    <p className="text-gray-500 text-sm mt-0.5">15 – 20 Mai 2025</p>
                  </div>
                  <button className="text-primary text-sm font-bold underline">Modifier</button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-dark text-sm">Voyageurs</p>
                    <p className="text-gray-500 text-sm mt-0.5">2 adultes, 1 enfant</p>
                  </div>
                  <button className="text-primary text-sm font-bold underline">Modifier</button>
                </div>
              </div>
            </section>

            {/* Informations voyageur */}
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-6">Informations voyageur</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Prénom</label>
                  <input type="text" placeholder="Jean" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Nom</label>
                  <input type="text" placeholder="Dupont" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Email</label>
                  <input type="email" placeholder="jean@email.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Téléphone</label>
                  <input type="tel" placeholder="+225 XX XX XX XX" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Message à l&apos;hôte (optionnel)</label>
                <textarea placeholder="Informations supplémentaires pour votre hôte..." rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors resize-none" />
              </div>
            </section>

            {/* Payer avec */}
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-6">Payer avec</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-2xl p-5 border transition-all",
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-gray-100 hover:border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                      )}>
                        <Icon size={22} />
                      </div>
                      <div className="text-left flex-1">
                        <p className={cn("font-bold text-sm", isActive ? "text-primary" : "text-dark")}>{method.label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{method.sublabel}</p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        isActive ? "border-primary bg-primary" : "border-gray-300"
                      )}>
                        {isActive && <Check size={10} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Politique d'annulation */}
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-4">Politique d&apos;annulation</h2>
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200/50 rounded-xl p-4">
                <AlertCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-dark text-sm font-medium">Annulation gratuite avant le 10 Mai 2025</p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                    Après cette date, les frais d&apos;annulation s&apos;élèvent à 50% du montant total de la réservation.
                  </p>
                </div>
              </div>
            </section>

            {/* Security note */}
            <div className="flex items-center gap-3 text-gray-500 text-sm px-2">
              <Shield size={16} className="text-green-500 flex-shrink-0" />
              <p>Paiement sécurisé. Vos données sont protégées par un chiffrement SSL 256 bits.</p>
            </div>
          </div>

          {/* Right Sticky Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 sticky top-28">
              {/* Property Mini Card */}
              <div className="flex gap-4 pb-6 border-b border-gray-100">
                <div className="w-24 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={property.img} alt={property.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-dark text-sm">{property.name}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                    <MapPin size={12} className="text-primary" />
                    {property.location}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs font-bold text-dark">⭐ {property.rating}</span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="py-6 space-y-3 border-b border-gray-100">
                <h3 className="font-heading font-bold text-dark text-base mb-4">Détails du prix</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{property.pricePerNight} {property.currency} × {nights} nuits</span>
                  <span className="font-medium text-dark">{subtotal} {property.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frais de service</span>
                  <span className="font-medium text-dark">{serviceFee} {property.currency}</span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-6 flex justify-between items-center mb-6">
                <span className="font-heading font-bold text-dark text-lg">Total</span>
                <span className="font-heading font-bold text-primary text-2xl">{total} {property.currency}</span>
              </div>

              {/* Pay Button */}
              <button
                onClick={() => router.push("/reservation/confirmation/1")}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-md transition-all text-base"
              >
                Payer {total} {property.currency}
              </button>

              <p className="text-center text-gray-400 text-xs mt-4 leading-relaxed">
                En confirmant, vous acceptez nos <a href="#" className="text-primary font-medium">Conditions</a> et la <a href="#" className="text-primary font-medium">Politique de confidentialité</a>.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
