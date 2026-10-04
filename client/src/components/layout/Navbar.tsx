"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Menu, X, ArrowRight, LogIn, UserPlus, Sun, Moon, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import api from "@/lib/api";
import { usePolling } from "@/lib/usePolling";

const UNREAD_POLL_INTERVAL_MS = 10_000;

const ROLE_LABELS: Record<string, string> = {
  voyageur: "Voyageur",
  hote: "Hôte",
  admin: "Administrateur",
};

function MessagesLink({ unread, onClick, className }: { unread: number; onClick?: () => void; className?: string }) {
  return (
    <Link
      href="/messages"
      onClick={onClick}
      aria-label={unread > 0 ? `Messages, ${unread} non lu(s)` : "Messages"}
      className={cn("text-gray-500 hover:text-primary transition-colors relative", className)}
    >
      <MessageCircle size={20} />
      {unread > 0 && (
        <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const authenticated = status === "authenticated";
  const roleLabel = ROLE_LABELS[session?.user?.role ?? ""] ?? "Voyageur";

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUnread = useCallback(async () => {
    const res = await api.get("/v1/messaging/unread-count/");
    setUnread(res.data.unread_count);
  }, []);

  // Rafraîchi à chaque changement de page (le badge baisse dès qu'on a lu un fil), puis toutes les 10 s et au retour du focus sur la fenêtre
  useEffect(() => {
    if (!authenticated) {
      setUnread(0);
      return;
    }
    fetchUnread().catch(() => {});
  }, [authenticated, pathname, fetchUnread]);

  usePolling(fetchUnread, UNREAD_POLL_INTERVAL_MS, authenticated);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#0f172a] border-b border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
          {/* Marque géométrique Adinkra — diamonds imbriqués */}
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="flex-shrink-0 transition-transform duration-500 group-hover:rotate-90">
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="30" y2="30">
                <stop stopColor="#E67E22" />
                <stop offset="1" stopColor="#F39C12" />
              </linearGradient>
            </defs>
            {/* Outer diamond */}
            <rect x="3" y="3" width="24" height="24" rx="3" transform="rotate(45 15 15)" fill="url(#lg1)" opacity="0.15" />
            {/* Middle ring */}
            <rect x="6" y="6" width="18" height="18" rx="2" transform="rotate(45 15 15)" stroke="url(#lg1)" strokeWidth="1.5" fill="none" />
            {/* Inner solid */}
            <rect x="10" y="10" width="10" height="10" rx="1.5" transform="rotate(45 15 15)" fill="url(#lg1)" />
          </svg>

          {/* Wordmark */}
          <span className="font-heading font-black text-[22px] tracking-tight leading-none select-none">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #E67E22 0%, #F39C12 100%)" }}
            >
              Afri
            </span>
            <span className="text-[#2C3E50] group-hover:text-primary transition-colors duration-300">Stay</span>
          </span>
        </Link>

        {/* Search Bar (Centered) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-auto">
          <div className="relative w-full flex items-center bg-white border border-gray-200 rounded-full py-1.5 pl-4 pr-1.5 shadow-sm hover:shadow transition-shadow">
            <Search size={18} className="text-gray-400 flex-shrink-0 mr-3" />
            <input 
              type="text" 
              placeholder="Rechercher une destination..." 
              className="w-full bg-transparent border-none text-sm text-dark outline-none placeholder:text-gray-400"
            />
            <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0 hover:bg-primary-600 transition-colors ml-2">
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-5">
            <Link href="/recherche" className="text-sm font-medium text-dark hover:text-primary transition-colors">Hébergements</Link>
            <Link href="/decouvrir" className="text-sm font-medium text-dark hover:text-primary transition-colors">Expériences</Link>
            <Link href="/hote" className="text-sm font-medium text-dark hover:text-primary transition-colors">Devenir hôte</Link>
          </nav>
          
          <div className="w-px h-6 bg-gray-200"></div>

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Basculer le thème"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}

            {mounted && status === "authenticated" && session ? (
              <>
                <MessagesLink unread={unread} />
                <button className="text-gray-500 hover:text-primary transition-colors relative">
                  <Bell size={20} />
                </button>
                <Link href="/profil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden lg:block">
                    <p className="text-xs font-bold text-dark leading-tight">{session.user?.name ?? "Mon profil"}</p>
                    <p className="text-[10px] text-gray-500">{roleLabel}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary/10 overflow-hidden border border-primary/20 flex items-center justify-center">
                    {session.user?.image ? (
                      <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold text-sm">{session.user?.name?.[0]?.toUpperCase() ?? "U"}</span>
                    )}
                  </div>
                </Link>
              </>
            ) : mounted && status !== "loading" ? (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-sm font-medium text-dark hover:text-primary transition-colors"
                >
                  <LogIn size={16} />
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <UserPlus size={15} />
                  S&apos;inscrire
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {/* Mobile : Messages toujours visible (avec badge), puis burger */}
        <div className="md:hidden flex items-center gap-1">
          {mounted && authenticated && (
            <div className="p-2 flex">
              <MessagesLink unread={unread} onClick={() => setMobileOpen(false)} />
            </div>
          )}
          <button
            className="p-2 text-dark"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4 shadow-lg">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 pb-2">
            <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
              <defs>
                <linearGradient id="lg2" x1="0" y1="0" x2="30" y2="30">
                  <stop stopColor="#E67E22" />
                  <stop offset="1" stopColor="#F39C12" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="24" height="24" rx="3" transform="rotate(45 15 15)" fill="url(#lg2)" opacity="0.15" />
              <rect x="6" y="6" width="18" height="18" rx="2" transform="rotate(45 15 15)" stroke="url(#lg2)" strokeWidth="1.5" fill="none" />
              <rect x="10" y="10" width="10" height="10" rx="1.5" transform="rotate(45 15 15)" fill="url(#lg2)" />
            </svg>
            <span className="font-heading font-black text-lg tracking-tight">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #E67E22 0%, #F39C12 100%)" }}>Afri</span>
              <span className="text-[#2C3E50]">Stay</span>
            </span>
          </div>
          <div className="relative w-full flex items-center bg-gray-50 border border-gray-200 rounded-full py-2 pl-4 pr-2 mb-4">
            <Search size={18} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full bg-transparent border-none text-sm text-dark outline-none"
            />
          </div>
          <div className="space-y-3">
            <Link href="/recherche" className="block text-sm font-medium text-dark" onClick={() => setMobileOpen(false)}>Hébergements</Link>
            <Link href="/decouvrir" className="block text-sm font-medium text-dark" onClick={() => setMobileOpen(false)}>Expériences</Link>
            <Link href="/hote" className="block text-sm font-medium text-dark" onClick={() => setMobileOpen(false)}>Devenir hôte</Link>
          </div>
          <div className="pt-4 border-t border-gray-100">
            {mounted && status === "authenticated" && session ? (
              <div className="flex items-center justify-between">
                <Link href="/profil" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                    {session.user?.image ? (
                      <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold">{session.user?.name?.[0]?.toUpperCase() ?? "U"}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-dark">{session.user?.name ?? "Mon profil"}</p>
                    <p className="text-xs text-gray-500">{roleLabel}</p>
                  </div>
                </Link>
                <button className="p-2 text-gray-500 relative">
                  <Bell size={20} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-3 rounded-xl border border-gray-200 text-sm font-bold text-dark hover:bg-gray-50 transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  Créer un compte
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
