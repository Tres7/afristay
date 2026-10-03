"use client";

import { ChevronRight, User, CalendarCheck, Heart, CreditCard, Bell, Globe, HelpCircle, LogOut, Star } from "lucide-react";
import { properties } from "@/lib/mockData";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const menuSections = [
  {
    title: "Compte",
    items: [
      { icon: User, label: "Mon profil", href: "/profil/edit", desc: "Modifier vos informations" },
      { icon: CalendarCheck, label: "Mes réservations", href: "/profil/reservations", desc: "Historique et à venir" },
      { icon: Heart, label: "Mes favoris", href: "/favoris", desc: "Hébergements sauvegardés" },
      { icon: CreditCard, label: "Moyens de paiement", href: "/profil/paiement", desc: "Cartes et Mobile Money" },
    ],
  },
  {
    title: "Préférences",
    items: [
      { icon: Bell, label: "Notifications", href: "/profil/notifications", desc: "Alertes et emails" },
      { icon: Globe, label: "Langue & Région", href: "/profil/langue", desc: "Français, EUR" },
    ],
  },
  {
    title: "Assistance",
    items: [
      { icon: HelpCircle, label: "Aide & Support", href: "/profil/aide", desc: "Centre d'aide, FAQ" },
    ],
  },
];

export default function ProfilPage() {
  const { data: session } = useSession();
  const fullName = session?.user?.name ?? "Utilisateur";
  const initials = fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const user = { name: fullName, since: "2025", initials };
  const favorites = properties.filter((p) => p.isFavorite);

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar gauche */}
          <div className="lg:col-span-1 space-y-6">
            {/* Carte profil */}
            <div className="bg-white rounded-3xl shadow-card overflow-hidden border border-light">
              <div className="bg-gradient-to-r from-primary to-accent h-32 relative" />
              <div className="px-8 pb-8 -mt-12 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-soft mx-auto mb-4 border-4 border-white relative z-10">
                  <span className="text-primary font-heading font-bold text-3xl tracking-wider">{user.initials}</span>
                </div>
                <h2 className="font-heading font-bold text-dark text-2xl">{user.name}</h2>
                <p className="text-muted text-sm mt-1">Membre Privilège depuis {user.since}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-3xl shadow-card p-8 border border-light">
              <h3 className="font-heading font-bold text-dark text-lg mb-6 flex items-center gap-2">
                <Star size={18} className="text-accent" />
                Statistiques
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Séjours d'exception", value: "3", color: "text-primary" },
                  { label: "Propriétés favorites", value: String(favorites.length), color: "text-dark" },
                  { label: "Note d'hôte certifié", value: "4.9", icon: <Star size={14} className="text-accent fill-accent inline-block ml-1" />, color: "text-accent" },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="flex items-center justify-between pb-4 border-b border-light last:border-0 last:pb-0">
                    <span className="text-muted text-sm font-medium">{label}</span>
                    <span className={`font-heading font-bold flex items-center ${color}`}>{value}{icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-8">
            {menuSections.map((section) => (
              <div key={section.title} className="bg-white rounded-3xl shadow-soft border border-light overflow-hidden">
                <div className="px-8 py-5 border-b border-light bg-light/30">
                  <h3 className="font-heading font-bold text-dark text-lg uppercase tracking-wider text-sm">{section.title}</h3>
                </div>
                <div className="divide-y divide-light">
                  {section.items.map(({ icon: Icon, label, href, desc }) => (
                    <Link
                      key={href}
                      href={href}
                      className="group flex items-center gap-5 px-8 py-5 hover:bg-light/50 transition-all duration-300"
                    >
                      <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 group-hover:scale-105 transition-all">
                        <Icon size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-dark text-base group-hover:text-primary transition-colors">{label}</p>
                        <p className="text-muted text-sm mt-0.5">{desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-muted flex-shrink-0 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Déconnexion */}
            <div className="bg-white rounded-3xl shadow-soft border border-light overflow-hidden">
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="group w-full flex items-center gap-5 px-8 py-5 hover:bg-red-50/50 transition-all duration-300">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                  <LogOut size={20} className="text-red-500" />
                </div>
                <span className="flex-1 text-left font-heading font-bold text-red-500 text-base">Déconnexion sécurisée</span>
                <ChevronRight size={18} className="text-red-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
