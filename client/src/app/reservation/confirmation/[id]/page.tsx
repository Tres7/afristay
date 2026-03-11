"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { CheckCircle, Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import api from "@/lib/api";

interface Reservation {
  id: string;
  reference: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  nights: number;
  status: string;
  hebergement_detail: {
    id: string;
    name: string;
    city: string;
    location: string;
    image_url: string;
  };
}

export default function ConfirmationPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/v1/reservations/${params.id}/`)
      .then((res) => setReservation(res.data))
      .finally(() => setLoading(false));
  }, [params.id]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">R\u00e9servation introuvable.</p>
      </div>
    );
  }

  const h = reservation.hebergement_detail;
  const heroImage = h.image_url || "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=600&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-16">

        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
          <div className="relative w-20 h-20 mx-auto mb-6">
            {[0, 1].map((i) => (
              <motion.div key={i} className="absolute inset-0 rounded-full bg-green-400/30" initial={{ scale: 0.6, opacity: 0.7 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 1.2, delay: i * 0.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeOut" }} />
            ))}
            <motion.div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.15 }}>
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.3 }}>
                <CheckCircle size={40} className="text-green-600" />
              </motion.div>
            </motion.div>
          </div>

          <motion.h1 className="font-heading font-bold text-dark text-3xl md:text-4xl mb-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
            R\u00e9servation confirm\u00e9e !
          </motion.h1>
          <motion.p className="text-gray-500 text-base max-w-lg mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }}>
            Votre s\u00e9jour est r\u00e9serv\u00e9. Un email de confirmation a \u00e9t\u00e9 envoy\u00e9 \u00e0{" "}
            <span className="font-medium text-dark">{session?.user?.email}</span>.
          </motion.p>
        </motion.div>

        <motion.div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.4 }}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 h-40 md:h-auto rounded-2xl overflow-hidden flex-shrink-0">
              <img src={heroImage} alt={h.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-heading font-bold text-dark text-xl">{h.name}</h2>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                    <MapPin size={14} className="text-primary" />
                    {h.location}, {h.city}
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  Confirm\u00e9e
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dates</p>
                    <p className="text-sm font-bold text-dark">{formatDate(reservation.check_in)} \u2013 {formatDate(reservation.check_out)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Voyageurs</p>
                    <p className="text-sm font-bold text-dark">{reservation.guests_count} personne{reservation.guests_count > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total pay\u00e9</p>
                  <p className="text-lg font-heading font-bold text-primary">{Number(reservation.total_price).toLocaleString()} FCFA</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">Num\u00e9ro de r\u00e9servation</p>
                <p className="text-sm font-mono font-bold text-dark">{reservation.reference}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div className="flex flex-col sm:flex-row gap-4 justify-center mt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0, duration: 0.4 }}>
          <Link href="/profil/reservations" className="bg-primary text-white font-bold px-8 py-4 rounded-full text-center shadow-button hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
            Voir mes r\u00e9servations <ArrowRight size={16} />
          </Link>
          <Link href="/" className="bg-white border border-gray-200 text-dark font-bold px-8 py-4 rounded-full text-center hover:bg-gray-50 transition-colors">
            Retour \u00e0 l&apos;accueil
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
