"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { ChevronRight, User, CalendarCheck, Heart, CreditCard, Bell, Globe, HelpCircle, LogOut, Home, MessageCircle, BadgeCheck, Star, ShieldCheck, Plane, Users, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { FALLBACK_IMAGE, formatDate, initials, ROLE_LABELS } from "@/lib/utils";
import type { Favori, Me, Paginated, Reservation, SejourAEvaluer } from "@/types/api/models";

export default function ProfilPage() {
  const { data: session } = useSession();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<Me>("/v1/users/me/")).data,
  });
  const { data: reservations } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => (await api.get<Paginated<Reservation>>("/v1/reservations/")).data.results,
  });
  const { data: aEvaluer = [] } = useQuery({
    queryKey: ["avis-a-laisser"],
    queryFn: async () => (await api.get<Paginated<SejourAEvaluer>>("/v1/avis/a-laisser/")).data.results,
  });
  const { data: favoris } = useQuery({
    queryKey: ["favoris"],
    queryFn: async () => (await api.get<Paginated<Favori>>("/v1/favoris/")).data.results,
  });

  const fullName = me ? `${me.first_name} ${me.last_name}` : session?.user?.name ?? "";
  const role = me?.role ?? session?.user?.role ?? "voyageur";
  const isHost = role === "hote" || role === "admin";
  const upcoming = reservations?.filter((r) => r.status !== "cancelled" && new Date(r.check_out) >= new Date()).length;
  const stays = reservations?.filter((r) => r.status !== "cancelled").length;

  const menuSections = [
    {
      title: "Compte",
      items: [
        { icon: User, label: "Mes informations", href: "/profil/edit", desc: "Nom, téléphone" },
        { icon: CalendarCheck, label: "Mes réservations", href: "/profil/reservations", desc: upcoming ? `${upcoming} séjour${upcoming > 1 ? "s" : ""} à venir` : "Historique et à venir" },
        { icon: Plane, label: "Mes transferts", href: "/profil/transferts", desc: "Chauffeurs à l'aéroport" },
        { icon: Users, label: "Voyages de groupe", href: "/together", desc: "AfriStay Together" },
        { icon: Sparkles, label: "Concierge IA", href: "/concierge", desc: "Votre assistant de voyage" },
        { icon: Heart, label: "Mes favoris", href: "/favoris", desc: "Hébergements sauvegardés" },
        { icon: MessageCircle, label: "Messages", href: "/messages", desc: "Échanges avec les hôtes" },
        isHost
          ? { icon: Home, label: "Espace hôte", href: "/hote/espace", desc: "Annonces et réservations reçues" }
          : { icon: Home, label: "Devenir hôte", href: "/hote", desc: "Publiez votre logement" },
        ...(role === "admin" ? [{ icon: ShieldCheck, label: "Back-office", href: "/backoffice", desc: "Administration de la plateforme" }] : []),
      ],
    },
    {
      title: "Préférences",
      items: [
        { icon: CreditCard, label: "Moyens de paiement", href: "/profil/paiement", desc: "Mobile Money, carte, PayPal" },
        { icon: Bell, label: "Notifications", href: "/profil/notifications", desc: "Alertes et emails" },
        { icon: Globe, label: "Langue & région", href: "/profil/langue", desc: "Français, FCFA" },
      ],
    },
    {
      title: "Assistance",
      items: [{ icon: HelpCircle, label: "Aide & support", href: "/profil/aide", desc: "FAQ, annulation, contact" }],
    },
  ];

  return (
    <div className="bg-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-card overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-primary to-accent h-24 sm:h-28" />
              <div className="px-6 pb-6 -mt-12 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-soft mx-auto mb-4 border-4 border-white overflow-hidden">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-heading font-bold text-3xl">{initials(fullName)}</span>
                  )}
                </div>
                <h1 className="font-heading font-bold text-dark text-xl sm:text-2xl break-words">{fullName || <span className="inline-block w-40 h-6 skeleton rounded" />}</h1>
                <p className="text-muted text-sm mt-1 break-all">{me?.email ?? session?.user?.email}</p>
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{ROLE_LABELS[role]}</span>
                  {me?.is_verified && <span className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full"><BadgeCheck size={12} /> Vérifié</span>}
                </div>
                {me?.date_joined && (
                  <p className="text-muted text-xs mt-3">Membre depuis {new Date(me.date_joined).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-card p-6 border border-gray-100 grid grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-0 lg:divide-y lg:divide-gray-100">
              {[
                { label: "Séjours", value: stays },
                { label: "À venir", value: upcoming },
                { label: "Favoris", value: favoris?.length },
              ].map(({ label, value }) => (
                <div key={label} className="text-center lg:text-left lg:flex lg:items-center lg:justify-between lg:py-3 first:pt-0 last:pb-0">
                  <span className="block text-muted text-xs lg:text-sm font-medium">{label}</span>
                  <span className="font-heading font-bold text-2xl lg:text-lg text-dark">{value ?? "–"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {aEvaluer.length > 0 && (
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-3xl p-5 sm:p-6">
                <p className="font-heading font-bold text-dark flex items-center gap-2">
                  <Star size={18} className="fill-accent text-accent" />
                  {aEvaluer.length === 1 ? "Un séjour attend votre avis" : `${aEvaluer.length} séjours attendent votre avis`}
                </p>
                <div className="mt-3 space-y-2">
                  {aEvaluer.map((s) => (
                    <Link key={s.reservation_id} href={`/profil/reservations/${s.reservation_id}/avis`} className="flex items-center gap-3 bg-white rounded-2xl p-3 hover:shadow-sm transition-shadow">
                      <img src={s.hebergement.image_url || FALLBACK_IMAGE} alt="" className="w-14 h-12 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-dark text-sm truncate">{s.hebergement.name}</p>
                        <p className="text-xs text-muted">Départ le {formatDate(s.check_out)}</p>
                      </div>
                      <span className="text-sm font-bold text-primary flex-shrink-0">Noter</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {menuSections.map((section) => (
              <div key={section.title} className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
                <h2 className="px-6 sm:px-8 py-4 border-b border-gray-100 bg-light-muted/50 font-heading font-bold text-dark uppercase tracking-wider text-xs">{section.title}</h2>
                <div className="divide-y divide-gray-100">
                  {section.items.map(({ icon: Icon, label, href, desc }) => (
                    <Link key={href} href={href} className="group flex items-center gap-4 px-6 sm:px-8 py-4 hover:bg-light-muted/50 transition-colors">
                      <div className="w-11 h-11 bg-primary/5 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Icon size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-dark text-[15px] group-hover:text-primary transition-colors">{label}</p>
                        <p className="text-muted text-sm mt-0.5 truncate">{desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-muted flex-shrink-0 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={() => signOut({ callbackUrl: "/" })} className="group w-full bg-white rounded-3xl shadow-soft border border-gray-100 flex items-center gap-4 px-6 sm:px-8 py-4 hover:bg-red-50/50 transition-colors">
              <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <LogOut size={20} className="text-red-600" />
              </div>
              <span className="flex-1 text-left font-heading font-bold text-red-600">Se déconnecter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
