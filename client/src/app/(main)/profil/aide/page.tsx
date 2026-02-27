"use client";

import Link from "next/link";
import { ArrowLeft, Search, ChevronRight, MessageCircle, FileText, Phone } from "lucide-react";
import { useState } from "react";

const faqCategories = [
  { id: "resa", title: "Réservations", icon: FileText, delay: "delay-100" },
  { id: "pay", title: "Paiement & Facturation", icon: FileText, delay: "delay-150" },
  { id: "host", title: "Devenir Hôte", icon: FileText, delay: "delay-200" },
  { id: "account", title: "Mon Compte", icon: FileText, delay: "delay-300" },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Link 
          href="/profil" 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-dark hover:bg-light transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-3xl text-dark">Centre d'aide</h1>
          <p className="text-muted text-sm mt-1">Comment pouvons-nous vous aider aujourd'hui ?</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Search Bar section */}
        <div className="bg-gradient-to-br from-primary to-primary-600 rounded-3xl p-10 md:p-14 text-white text-center shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
          
          <div className="max-w-xl mx-auto relative z-10 w-full">
            <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6 text-white text-glow">Trouvez une réponse rapidement</h2>
            <div className="relative flex items-center w-full">
              <div className="absolute left-5 text-dark/40">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher 'Annulation', 'Remboursement'..."
                className="w-full bg-white text-dark rounded-full py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg text-[15px] placeholder:text-muted/60 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FAQ Categories - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-heading font-bold text-xl text-dark mb-4">Sujets fréquents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {faqCategories.map(cat => (
                <button
                  key={cat.id}
                  className="flex items-center justify-between p-5 bg-white rounded-2xl border border-light shadow-sm hover:shadow-card hover:border-primary/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                      <cat.icon size={18} />
                    </div>
                    <span className="font-medium text-dark group-hover:text-primary transition-colors">{cat.title}</span>
                  </div>
                  <ChevronRight size={18} className="text-muted group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>

            <div className="mt-8">
               <h3 className="font-heading font-bold text-xl text-dark mb-4">Articles populaires</h3>
               <div className="bg-white rounded-2xl border border-light shadow-sm overflow-hidden">
                 {['Comment annuler une réservation ?', 'Quand serai-je débité ?', 'Contacter mon hôte', 'Problème lors du paiement'].map((article, i) => (
                   <Link key={i} href="#" className={cn(
                     "flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group",
                     i !== 3 && "border-b border-light"
                   )}>
                     <span className="text-dark/80 font-medium text-sm group-hover:text-primary transition-colors">{article}</span>
                     <ChevronRight size={16} className="text-muted/50 group-hover:text-primary transition-colors" />
                   </Link>
                 ))}
               </div>
            </div>
          </div>

          {/* Contact - Right Side */}
          <div className="space-y-6">
            <h3 className="font-heading font-bold text-xl text-dark mb-4">Contactez-nous</h3>
            <div className="bg-white rounded-2xl border border-light shadow-card p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <MessageCircle size={28} />
              </div>
              <div>
                <h4 className="font-bold text-dark text-lg">Chat en direct</h4>
                <p className="text-sm text-muted mt-1 leading-relaxed">Notre équipe est disponible 24/7 pour répondre à vos questions par message.</p>
              </div>
              <button className="w-full bg-dark text-white font-medium py-3 rounded-xl hover:bg-black transition-colors mt-2">
                Démarrer le chat
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-light shadow-sm p-6 flex items-center gap-4 hover:border-primary/20 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-dark/70 group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                <Phone size={20} />
              </div>
              <div>
                <h4 className="font-medium text-dark text-sm">Appeler le support</h4>
                <p className="text-xs text-muted mt-0.5">+225 01 02 03 04</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper local pour 'cn' vu qu'on a pas importé @/lib/utils dans le snippet plus haut
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
