"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, CheckCircle, Clock, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { cn, FALLBACK_IMAGE, formatDate, formatPrice, isoDate } from "@/lib/utils";
import PropertyCard from "@/components/hebergement/PropertyCard";
import type { Hebergement, Paginated, Reservation } from "@/types/api/models";

const TABS = [
  { id: "upcoming", label: "À venir" },
  { id: "past", label: "Passées" },
  { id: "cancelled", label: "Annulées" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const tabFor = (r: Reservation): Tab => {
  if (r.status === "cancelled") return "cancelled";
  return r.check_out >= isoDate() ? "upcoming" : "past";
};

const STATUS = {
  confirmed: { label: "Confirmée", icon: CheckCircle, className: "bg-green-100 text-green-700" },
  pending: { label: "En attente", icon: Clock, className: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "Annulée", icon: XCircle, className: "bg-red-100 text-red-700" },
};

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: reservations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => (await api.get<Paginated<Reservation>>("/v1/reservations/")).data.results,
  });

  // Recommandations : hébergements les mieux notés que l'on n'a pas déjà réservés
  const { data: recommended = [] } = useQuery({
    queryKey: ["hebergements", "recommandes-profil"],
    queryFn: async () => (await api.get<Paginated<Hebergement>>("/v1/hebergements/", { params: { sort: "note", limit: 8 } })).data.results,
  });
  const reservedIds = new Set(reservations.map((r) => r.hebergement_detail.id));
  const suggestions = recommended.filter((h) => !reservedIds.has(h.id)).slice(0, 3);

  const handleCancel = async (r: Reservation) => {
    if (!window.confirm(`Annuler votre séjour à « ${r.hebergement_detail.name} » ?`)) return;
    setCancellingId(r.id);
    try {
      await api.delete(`/v1/reservations/${r.id}/`);
      queryClient.setQueryData<Reservation[]>(["reservations"], (prev) => prev?.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)));
      toast.success("Réservation annulée");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Impossible d'annuler cette réservation."));
    } finally {
      setCancellingId(null);
    }
  };

  const counts = Object.fromEntries(TABS.map((t) => [t.id, reservations.filter((r) => tabFor(r) === t.id).length])) as Record<Tab, number>;
  const filtered = reservations.filter((r) => tabFor(r) === activeTab);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/profil" aria-label="Retour au profil" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-dark hover:bg-light-muted transition-colors flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-dark">Mes réservations</h1>
          <p className="text-gray-500 text-sm mt-1">Vos séjours à venir et votre historique.</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn("pb-3 text-sm font-bold transition-colors whitespace-nowrap border-b-2", activeTab === tab.id ? "text-primary border-primary" : "text-gray-400 border-transparent hover:text-dark")}
          >
            {tab.label}{counts[tab.id] > 0 && <span className="ml-1.5 text-xs">({counts[tab.id]})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [0, 1].map((i) => <div key={i} className="h-48 skeleton rounded-2xl" />)
        ) : isError ? (
          <div className="bg-white rounded-3xl p-12 text-center">
            <p className="text-red-500 font-medium mb-2">Impossible de charger vos réservations.</p>
            <button onClick={() => refetch()} className="text-primary font-bold hover:underline">Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 sm:p-16 text-center">
            <p className="text-gray-500 font-medium mb-4">Aucune réservation dans cette catégorie.</p>
            {activeTab === "upcoming" && <Link href="/recherche" className="inline-block bg-primary text-white font-bold px-6 py-3 rounded-xl">Trouver un hébergement</Link>}
          </div>
        ) : (
          filtered.map((res) => {
            const status = STATUS[res.status];
            const canCancel = res.status !== "cancelled" && res.check_in > isoDate();
            return (
              <article key={res.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col sm:flex-row hover:shadow-card transition-shadow">
                <Link href={`/hebergements/${res.hebergement_detail.id}`} className="w-full sm:w-48 md:w-56 h-44 sm:h-auto flex-shrink-0">
                  <img src={res.hebergement_detail.image_url || FALLBACK_IMAGE} alt={res.hebergement_detail.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h2 className="font-heading font-bold text-lg text-dark truncate">{res.hebergement_detail.name}</h2>
                        <p className="flex items-center gap-1.5 text-gray-500 text-sm mt-1"><MapPin size={14} className="text-primary flex-shrink-0" />{res.hebergement_detail.city}</p>
                      </div>
                      <span className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0", status.className)}>
                        <status.icon size={12} /> {status.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                      <span className="flex items-center gap-2"><Calendar size={14} className="text-primary" />{formatDate(res.check_in)} → {formatDate(res.check_out)}</span>
                      <span className="flex items-center gap-2"><Users size={14} className="text-primary" />{res.guests_count} voyageur{res.guests_count > 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-2">{res.reference}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-500">Total</span>
                      <p className="font-heading font-bold text-lg text-dark">{formatPrice(res.total_price)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/reservation/confirmation/${res.id}`} className="px-5 py-2 bg-gray-100 text-dark text-sm font-medium rounded-full hover:bg-gray-200 transition-colors">
                        Détails
                      </Link>
                      {canCancel && (
                        <button onClick={() => handleCancel(res)} disabled={cancellingId === res.id} className="px-5 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-full hover:bg-red-100 transition-colors disabled:opacity-50">
                          {cancellingId === res.id ? "Annulation..." : "Annuler"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {suggestions.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading font-bold text-xl text-dark mb-6">Recommandé pour votre prochain voyage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((h) => <PropertyCard key={h.id} property={h} />)}
          </div>
        </section>
      )}
    </div>
  );
}
