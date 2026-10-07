"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, Home, LayoutDashboard, Menu, ShieldAlert, Star, Users } from "lucide-react";
import Logo from "@/components/layout/Logo";
import MobileDrawer, { DrawerItem } from "@/components/layout/MobileDrawer";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/backoffice", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/backoffice/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/backoffice/annonces", label: "Annonces", icon: Home },
  { href: "/backoffice/reservations", label: "Réservations", icon: CalendarCheck },
  { href: "/backoffice/avis", label: "Avis", icon: Star },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const actif = (href: string) => (href === "/backoffice" ? pathname === href : pathname.startsWith(href));
  const courant = NAV.find((n) => actif(n.href));
  const [menuOuvert, setMenuOuvert] = useState(false);

  // Ferme le panneau mobile après chaque navigation
  useEffect(() => setMenuOuvert(false), [pathname]);

  if (status === "loading") return <div className="min-h-screen bg-gray-50" />;

  // Le middleware filtre déjà ; double contrôle côté page (le backend reste seul juge : 403 sinon)
  if (session?.user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-gray-50">
        <ShieldAlert size={40} className="text-red-600" />
        <p className="font-heading font-bold text-xl text-dark">Accès réservé aux administrateurs</p>
        <Link href="/" className="text-primary font-bold hover:underline">Retour au site</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 bg-white border-r border-gray-100 sticky top-0 h-screen p-5">
        <Logo size="sm" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted mt-2 mb-8">Back-office</p>
        <nav className="space-y-1 flex-1" aria-label="Back-office">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", actif(href) ? "bg-primary/10 text-primary" : "text-dark hover:bg-gray-50")}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-muted truncate">{session.user.email}</p>
          <Link href="/" className="mt-2 flex items-center gap-2 text-sm font-medium text-dark hover:text-primary"><ArrowLeft size={15} /> Retour au site</Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between gap-3 px-4 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Logo size="sm" />
              <span className="text-xs font-semibold text-muted truncate">· {courant?.label ?? "Back-office"}</span>
            </div>
            <button onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu du back-office" aria-haspopup="dialog" aria-expanded={menuOuvert}
              className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-dark hover:bg-gray-100">
              <Menu size={22} />
            </button>
          </div>
        </header>

        <MobileDrawer open={menuOuvert} onClose={() => setMenuOuvert(false)} label="Menu du back-office"
          header={<span className="text-[11px] font-bold uppercase tracking-widest text-muted">Back-office</span>}>
          <nav className="space-y-1" aria-label="Back-office">
            {NAV.map(({ href, label, icon: Icon }) => (
              <DrawerItem key={href}>
                <Link href={href} onClick={() => setMenuOuvert(false)}
                  className={cn("flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-colors", actif(href) ? "bg-primary/10 text-primary" : "text-dark hover:bg-gray-50")}>
                  <Icon size={18} /> {label}
                </Link>
              </DrawerItem>
            ))}
          </nav>
          <DrawerItem className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-muted truncate px-3">{session.user.email}</p>
            <Link href="/" className="mt-2 flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-dark hover:bg-gray-50"><ArrowLeft size={18} /> Retour au site</Link>
          </DrawerItem>
        </MobileDrawer>
        <main id="contenu" tabIndex={-1} className="p-4 sm:p-6 lg:p-8 max-w-7xl outline-none">{children}</main>
      </div>
    </div>
  );
}
