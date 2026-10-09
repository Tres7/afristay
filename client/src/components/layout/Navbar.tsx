"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, ArrowRight, LogIn, UserPlus, MessageCircle, Heart, CalendarCheck, User, LogOut, Home, ShieldCheck, Plane, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import api from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { cn, initials, ROLE_LABELS } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import MobileDrawer, { DrawerItem } from "@/components/layout/MobileDrawer";

const UNREAD_POLL_INTERVAL_MS = 10_000;

const NAV_LINKS = [
  { href: "/recherche", label: "Hébergements" },
  { href: "/decouvrir", label: "Expériences" },
  { href: "/transfert", label: "Transferts" },
  { href: "/together", label: "Together" },
  { href: "/hote", label: "Devenir hôte" },
];

function SearchForm({ onDone, className }: { onDone?: () => void; className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const city = q.trim();
    router.push(city ? `/recherche?city=${encodeURIComponent(city)}` : "/recherche");
    setQ("");
    onDone?.();
  };

  return (
    <form onSubmit={submit} role="search" className={cn("relative w-full flex items-center bg-white border border-gray-200 rounded-full py-1.5 pl-4 pr-1.5 shadow-sm hover:shadow transition-shadow", className)}>
      <Search size={18} className="text-gray-400 flex-shrink-0 mr-3" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher une ville…"
        aria-label="Rechercher une destination"
        className="w-full bg-transparent border-none text-base md:text-sm text-dark outline-none placeholder:text-gray-400"
      />
      <button type="submit" aria-label="Lancer la recherche" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0 hover:bg-primary-600 transition-colors ml-2">
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && !!session && !session.error;

  const [unread, setUnread] = useState(0);
  const fetchUnread = useCallback(async () => {
    const res = await api.get<{ unread_count: number }>("/v1/messaging/unread-count/");
    setUnread(res.data.unread_count);
  }, []);

  // Rafraîchi à chaque changement de page (le badge baisse dès qu'on a lu un fil),
  // puis toutes les 10 s et au retour du focus sur la fenêtre
  useEffect(() => {
    if (!authenticated) {
      setUnread(0);
      return;
    }
    fetchUnread().catch(() => {});
  }, [authenticated, pathname, fetchUnread]);

  usePolling(fetchUnread, UNREAD_POLL_INTERVAL_MS, authenticated);

  // Ferme le menu mobile à chaque navigation (le panneau gère lui-même le blocage du défilement)
  useEffect(() => setMobileOpen(false), [pathname]);

  const roleLabel = ROLE_LABELS[session?.user?.role ?? "voyageur"];
  const isHost = session?.user?.role === "hote" || session?.user?.role === "admin";
  const isAdmin = session?.user?.role === "admin";

  const Avatar = ({ size }: { size: string }) => (
    <div className={cn("rounded-full bg-primary/10 overflow-hidden border border-primary/20 flex items-center justify-center flex-shrink-0", size)}>
      {session?.user?.image ? (
        <img src={session.user.image} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-primary font-bold text-sm">{initials(session?.user?.name)}</span>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-4 lg:gap-6">
        <Logo />

        <div className="hidden lg:flex flex-1 max-w-md mx-auto">
          <SearchForm />
        </div>

        <div className="hidden md:flex items-center gap-5 lg:gap-6">
          <nav className="flex items-center gap-4 lg:gap-5" aria-label="Navigation principale">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={isHost && href === "/hote" ? "/hote/espace" : href}
                className={cn("text-sm font-medium transition-colors whitespace-nowrap", pathname.startsWith(href) ? "text-primary" : "text-dark hover:text-primary")}
              >
                {isHost && href === "/hote" ? "Espace hôte" : label}
              </Link>
            ))}
          </nav>

          <div className="w-px h-6 bg-gray-200" />

          <div className="flex items-center gap-3">
            {authenticated ? (
              <>
                {isAdmin && (
                  <Link href="/backoffice" className="flex items-center gap-1.5 text-xs font-bold text-dark border border-gray-200 rounded-full px-3 py-1.5 hover:border-primary hover:text-primary">
                    <ShieldCheck size={14} /> Back-office
                  </Link>
                )}
                <Link href="/messages" className="relative p-2 text-gray-500 hover:text-primary transition-colors" aria-label={`Messages${unread ? ` (${unread} non lus)` : ""}`}>
                  <MessageCircle size={20} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <Link href="/profil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden xl:block">
                    <p className="text-xs font-bold text-dark leading-tight max-w-[140px] truncate">{session.user?.name ?? "Mon profil"}</p>
                    <p className="text-[10px] text-gray-500">{roleLabel}</p>
                  </div>
                  <Avatar size="w-9 h-9" />
                </Link>
              </>
            ) : status !== "loading" ? (
              <>
                <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className="flex items-center gap-1.5 text-sm font-medium text-dark hover:text-primary transition-colors whitespace-nowrap">
                  <LogIn size={16} />
                  Se connecter
                </Link>
                <Link href="/register" className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap">
                  <UserPlus size={15} />
                  S&apos;inscrire
                </Link>
              </>
            ) : (
              <div className="w-24 h-9 rounded-full skeleton" />
            )}
          </div>
        </div>

        <div className="flex md:hidden items-center gap-1">
          {authenticated && (
            <Link href="/messages" className="relative p-2 text-dark" aria-label="Messages">
              <MessageCircle size={22} />
              {unread > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
            </Link>
          )}
          <button className="p-2 text-dark" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-haspopup="dialog" aria-label="Ouvrir le menu">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Recherche visible sur tablette */}
      <div className="hidden md:block lg:hidden px-6 pb-3">
        <SearchForm />
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} label="Menu" header={<Logo size="sm" />}>
        <DrawerItem>
          <SearchForm onDone={() => setMobileOpen(false)} className="bg-gray-50" />
        </DrawerItem>

        {authenticated && (
          <DrawerItem className="mt-5">
            <Link href="/profil" className="flex items-center gap-3 p-3 rounded-2xl bg-light-muted">
              <Avatar size="w-11 h-11" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-dark truncate">{session.user?.name ?? "Mon profil"}</p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
            </Link>
          </DrawerItem>
        )}

        <nav className="mt-4 space-y-1" aria-label="Navigation mobile">
          {[
            { href: "/", label: "Accueil", icon: Home },
            { href: "/recherche", label: "Hébergements", icon: Search },
            { href: "/decouvrir", label: "Expériences", icon: ArrowRight },
            { href: "/transfert", label: "Transfert aéroport", icon: Plane },
            { href: "/together", label: "Voyager à plusieurs", icon: Users },
            ...(authenticated
              ? [
                  { href: "/profil/reservations", label: "Mes réservations", icon: CalendarCheck },
                  { href: "/favoris", label: "Mes favoris", icon: Heart },
                  { href: "/messages", label: `Messages${unread ? ` (${unread})` : ""}`, icon: MessageCircle },
                  { href: "/profil", label: "Mon profil", icon: User },
                ]
              : []),
            { href: isHost ? "/hote/espace" : "/hote", label: isHost ? "Espace hôte" : "Devenir hôte", icon: Home },
            ...(isAdmin ? [{ href: "/backoffice", label: "Back-office", icon: ShieldCheck }] : []),
          ].map(({ href, label, icon: Icon }) => (
            <DrawerItem key={href + label}>
              <Link
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn("flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-colors", pathname === href ? "bg-primary/10 text-primary" : "text-dark hover:bg-gray-50")}
              >
                <Icon size={18} className="text-primary" />
                {label}
              </Link>
            </DrawerItem>
          ))}
        </nav>

        <DrawerItem className="mt-4 pt-4 border-t border-gray-100">
          {authenticated ? (
            <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-600 text-sm font-bold">
              <LogOut size={16} /> Se déconnecter
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} onClick={() => setMobileOpen(false)} className="w-full text-center py-3 rounded-xl border border-gray-200 text-sm font-bold text-dark hover:bg-gray-50 transition-colors">
                Se connecter
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="w-full text-center py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                Créer un compte
              </Link>
            </div>
          )}
        </DrawerItem>
      </MobileDrawer>
    </header>
  );
}
