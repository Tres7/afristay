"use client";

import Link from "next/link";
import { ArrowLeft, Globe, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const languages = [
  { id: "fr", name: "Français", region: "France / Afrique Francophone" },
  { id: "en", name: "English", region: "United States / UK" },
  { id: "es", name: "Español", region: "España / Latinoamérica" },
  { id: "pt", name: "Português", region: "Portugal / Brasil" },
];

const currencies = [
  { id: "XOF", name: "Franc CFA (BCEAO)", symbol: "FCFA" },
  { id: "EUR", name: "Euro", symbol: "€" },
  { id: "USD", name: "Dollar Américain", symbol: "$" },
  { id: "MAD", name: "Dirham Marocain", symbol: "MAD" },
];

export default function LanguagePage() {
  const [selectedLang, setSelectedLang] = useState("fr");
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link 
          href="/profil" 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-dark hover:bg-light transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-3xl text-dark">Langue et région</h1>
          <p className="text-muted text-sm mt-1">Personnalisez votre affichage linguistique et monétaire</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card p-6 md:p-10 space-y-10">
        
        {/* Langues */}
        <div>
          <div className="flex items-center gap-3 mb-6 border-b border-light pb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Globe size={18} />
            </div>
            <h2 className="font-heading font-semibold text-xl text-dark">Langue de l'interface</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {languages.map(lang => (
              <button
                key={lang.id}
                onClick={() => setSelectedLang(lang.id)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border text-left transition-all",
                  selectedLang === lang.id 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-light hover:border-primary/30"
                )}
              >
                <div>
                  <h3 className="font-medium text-dark">{lang.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{lang.region}</p>
                </div>
                {selectedLang === lang.id && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">
                    <Check size={14} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Devises */}
        <div>
          <div className="flex items-center gap-3 mb-6 border-b border-light pb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
              €
            </div>
            <h2 className="font-heading font-semibold text-xl text-dark">Devise par défaut</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currencies.map(currency => (
              <button
                key={currency.id}
                onClick={() => setSelectedCurrency(currency.id)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border text-left transition-all",
                  selectedCurrency === currency.id 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-light hover:border-primary/30"
                )}
              >
                <div>
                  <h3 className="font-medium text-dark">{currency.name}</h3>
                  <p className="text-xs text-muted mt-0.5 font-mono">{currency.id} - {currency.symbol}</p>
                </div>
                {selectedCurrency === currency.id && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">
                    <Check size={14} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
