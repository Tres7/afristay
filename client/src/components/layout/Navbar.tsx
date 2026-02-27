"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Menu, X, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
          <img src="/logo.png" alt="AfriStay Logo" className="h-8 w-auto object-contain" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
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
            {mounted && status === "authenticated" && session ? (
              <>
                <button className="text-gray-500 hover:text-primary transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                </button>
                <Link href="/profil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden lg:block">
                    <p className="text-xs font-bold text-dark leading-tight">{session.user?.name ?? "Mon profil"}</p>
                    <p className="text-[10px] text-gray-500">Voyageur</p>
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

        {/* Burger — mobile */}
        <button
          className="md:hidden p-2 text-dark"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4 shadow-lg">
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
                    <p className="text-xs text-gray-500">Voyageur</p>
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
