"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, Calendar, CalendarDays, Users, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { cn, FALLBACK_IMAGE, formatDate, formatPrice, isoDate, TYPE_LABELS } from "@/lib/utils";
import HebergementForm from "@/components/hote/HebergementForm";
import RatingBadge from "@/components/avis/RatingBadge";
import type { Hebergement, Paginated, Reservation } from "@/types/api/models";
import type { MessagingConversation } from "@/types/api/messaging";

type Tab = "annonces" | "reservations";

const PAYMENT_LABELS: Record<string, string> = { mobile_money: "Mobile Money", carte: "Carte", paypal: "PayPal" };

function EspaceHoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("annonces");
  const [editing, setEditing] = useState<Hebergement | "new" | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);

  // Ouvre (ou retrouve) la conversation avec le voyageur de cette réservation
  const contacterVoyageur = async (r: Reservation) => {
    setContactId(r.id);
    try {
      const res = await api.post<MessagingConversation>("/v1/messaging/conversations/avec-voyageur/", { reservation_id: r.id });
      router.push(`/messages/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Impossible d'ouvrir la conversation."));
      setContactId(null);
    }
  };

  const isHost = session?.user?.role === "hote" || session?.user?.role === "admin";

  useEffect(() => {
    if (searchParams.get("bienvenue") === "1") {
      toast.success("Bienvenue ! Publiez votre premier logement.");
      router.replace("/hote/espace");
    }
  }, [searchParams, router]);

  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ["hebergements", "mine"],
    queryFn: async () => (await api.get<Paginated<Hebergement>>("/v1/hebergements/mine/")).data.results,
    enabled: isHost,
  });

  const { data: reservations = [], isLoading: resLoading } = useQuery({
    queryKey: ["reservations", "host"],
    queryFn: async () => (await api.get<Paginated<Reservation>>("/v1/reservations/", { params: { as: "host" } })).data.results,
    enabled: isHost,
  });

  if (status === "loading") return <div className="max-w-6xl mx-auto px-4 py-10"><div className="h-64 skeleton rounded-3xl" /></div>;

  if (!isHost) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-4 px-6">
        <p className="font-heading font-bold text-xl text-dark">Vous n&apos;êtes pas encore hôte</p>
        <Link href="/hote" className="bg-primary text-white font-bold px-6 py-3 rounded-xl">Devenir hôte</Link>
      </div>
    );
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hebergements"] });
    queryClient.invalidateQueries({ queryKey: ["villes"] });
  };

  const toggleAvailability = async (h: Hebergement) => {
    try {
      await api.patch(`/v1/hebergements/${h.id}/`, { is_available: !h.is_available });
      toast.success(h.is_available ? "Annonce masquée des recherches" : "Annonce de nouveau visible");
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async (h: Hebergement) => {
    if (!window.confirm(`Supprimer définitivement « ${h.name} » ? Les réservations associées seront aussi supprimées.`)) return;
    try {
      await api.delete(`/v1/hebergements/${h.id}/`);
      toast.success("Annonce supprimée");
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const upcoming = reservations.filter((r) => r.status !== "cancelled" && r.check_out >= isoDate());
  const revenue = reservations.filter((r) => r.status !== "cancelled").reduce((s, r) => s + Number(r.total_price), 0);

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-dark mb-6">{editing === "new" ? "Nouvelle annonce" : "Modifier l'annonce"}</h1>
        <div className="bg-white rounded-3xl shadow-card p-5 sm:p-8">
          <HebergementForm
            initial={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={(h) => {
              toast.success(editing === "new" ? "Annonce publiée !" : "Annonce mise à jour");
              setEditing(null);
              refresh();
              if (editing === "new") router.push(`/hebergements/${h.id}`);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-dark">Espace hôte</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos annonces et suivez vos réservations.</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center justify-center gap-2 bg-primary text-white font-bold px-5 py-3 rounded-xl shadow-button hover:bg-primary-600">
          <Plus size={18} /> Nouvelle annonce
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[
          { label: "Annonces", value: annonces.length },
          { label: "Séjours à venir", value: upcoming.length },
          { label: "Total réservé", value: formatPrice(revenue) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm min-w-0">
            <p className="text-xs text-muted font-medium">{s.label}</p>
            <p className="font-heading font-bold text-dark text-lg sm:text-2xl mt-1 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-6" role="tablist">
        {([["annonces", `Mes annonces (${annonces.length})`], ["reservations", `Réservations reçues (${reservations.length})`]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", tab === id ? "text-primary border-primary" : "text-gray-400 border-transparent hover:text-dark")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "annonces" ? (
        isLoading ? (
          <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-36 skeleton rounded-2xl" />)}</div>
        ) : annonces.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-16 text-center border border-gray-100">
            <p className="text-gray-500 mb-4">Vous n&apos;avez pas encore publié d&apos;annonce.</p>
            <button onClick={() => setEditing("new")} className="bg-primary text-white font-bold px-6 py-3 rounded-xl">Publier mon premier logement</button>
          </div>
        ) : (
          <div className="space-y-4">
            {annonces.map((h) => (
              <article key={h.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row">
                <Link href={`/hebergements/${h.id}`} className="sm:w-48 h-40 sm:h-auto flex-shrink-0 relative">
                  <img src={h.image_url || FALLBACK_IMAGE} alt={h.name} className={cn("w-full h-full object-cover", !h.is_available && "grayscale opacity-60")} />
                  {!h.is_available && <span className="absolute top-3 left-3 bg-dark text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full">Masquée</span>}
                </Link>
                <div className="flex-1 p-5 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-heading font-bold text-dark truncate">{h.name}</h2>
                      <p className="flex items-center gap-1 text-sm text-gray-500 mt-1"><MapPin size={13} className="text-primary" />{h.city} · {TYPE_LABELS[h.type]} · {h.max_guests} pers.</p>
                    </div>
                    <p className="font-heading font-bold text-primary whitespace-nowrap">{formatPrice(h.price_per_night)}<span className="text-xs text-gray-400 font-normal">/nuit</span></p>
                  </div>
                  <RatingBadge rating={h.rating} count={h.review_count} variant="full" className="mt-2" />
                  <div className="flex flex-wrap gap-2 mt-auto pt-4">
                    <button onClick={() => setEditing(h)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 text-dark text-sm font-medium hover:bg-gray-200"><Pencil size={14} /> Modifier</button>
                    <Link href={`/hote/espace/calendrier/${h.id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 text-dark text-sm font-medium hover:bg-gray-200"><CalendarDays size={14} /> Calendrier</Link>
                    <button onClick={() => toggleAvailability(h)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 text-dark text-sm font-medium hover:bg-gray-200">
                      {h.is_available ? <><EyeOff size={14} /> Masquer</> : <><Eye size={14} /> Publier</>}
                    </button>
                    <button onClick={() => remove(h)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100"><Trash2 size={14} /> Supprimer</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : resLoading ? (
        <div className="h-36 skeleton rounded-2xl" />
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-16 text-center border border-gray-100 text-gray-500">Aucune réservation reçue pour le moment.</div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <article key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-dark truncate">{r.hebergement_detail.name}</p>
                <p className="text-sm text-gray-500">Par {r.guest_name} · <span className="font-mono text-xs">{r.reference}</span></p>
                {r.message && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-xl px-3 py-2 italic">« {r.message} »</p>}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" />{formatDate(r.check_in)} → {formatDate(r.check_out)}</span>
                <span className="flex items-center gap-1.5"><Users size={14} className="text-primary" />{r.guests_count}</span>
              </div>
              <div className="flex items-center justify-between md:flex-col md:items-end gap-1">
                <span className="font-heading font-bold text-dark">{formatPrice(r.total_price)}</span>
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", r.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                  {r.status === "cancelled" ? "Annulée" : `Confirmée · ${PAYMENT_LABELS[r.payment_method]}`}
                </span>
                {r.status !== "cancelled" && (
                  <button
                    onClick={() => contacterVoyageur(r)} disabled={contactId === r.id}
                    className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 disabled:opacity-50"
                  >
                    <MessageCircle size={14} /> {contactId === r.id ? "Ouverture..." : `Contacter ${r.guest_name.split(" ")[0]}`}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EspaceHotePage() {
  return (
    <Suspense>
      <EspaceHoteContent />
    </Suspense>
  );
}
