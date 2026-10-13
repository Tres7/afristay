"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import Logo from "@/components/layout/Logo";

export default function EnTeteAgent() {
  const { data: session } = useSession();
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <Link href="/agent" className="text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-primary">Visites</Link>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm text-dark truncate">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/" })} aria-label="Se déconnecter" className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
