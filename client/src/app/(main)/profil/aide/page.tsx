"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ChevronDown, MessageCircle } from "lucide-react";
import SubPageHeader from "@/components/layout/SubPageHeader";

const SECTIONS = [
  {
    id: "reservations",
    title: "Réservations",
    items: [
      { q: "Comment réserver un hébergement ?", a: "Choisissez vos dates et le nombre de voyageurs sur la fiche de l'hébergement, puis cliquez sur « Réserver ». Sélectionnez un mode de paiement et confirmez : la réservation est immédiatement confirmée et apparaît dans « Mes réservations »." },
      { q: "Puis-je réserver si le logement est déjà pris ?", a: "Non. Les dates déjà réservées sont bloquées et la recherche avec dates n'affiche que les logements disponibles sur la période." },
      { q: "Comment contacter mon hôte ?", a: "Depuis la fiche de l'hébergement, cliquez sur « Contacter ». La conversation est ensuite accessible dans « Messages »." },
    ],
  },
  {
    id: "annulation",
    title: "Annulation",
    items: [
      { q: "Comment annuler une réservation ?", a: "Dans Profil → Mes réservations, cliquez sur « Annuler » sur le séjour concerné. L'annulation est possible jusqu'à la veille de la date d'arrivée." },
      { q: "Puis-je annuler un séjour commencé ?", a: "Non, un séjour commencé ou terminé ne peut plus être annulé en ligne. Contactez votre hôte via la messagerie." },
    ],
  },
  {
    id: "paiement",
    title: "Paiement",
    items: [
      { q: "Quels moyens de paiement sont acceptés ?", a: "Mobile Money (Moov, T-Money, MTN, Orange, Airtel…) et carte Visa ou Mastercard via FedaPay, ou PayPal (débité en euros). Vous choisissez au moment de la réservation." },
      { q: "Quand suis-je débité ?", a: "Au moment de la réservation, sur la page sécurisée de FedaPay ou de PayPal. Les dates sont bloquées 30 minutes le temps de payer ; la réservation est confirmée dès le paiement reçu." },
      { q: "Quand l'hôte est-il payé ?", a: "Kwa-Ba conserve votre paiement jusqu'à votre arrivée et ne le verse à l'hôte que 24 heures après le début du séjour. En cas de problème à l'arrivée, signalez-le dans ce délai." },
      { q: "Comment suis-je remboursé ?", a: "Sur le moyen de paiement utilisé, selon la politique d'annulation : intégralement à plus de 7 jours de l'arrivée, partiellement entre 7 jours et 48 heures." },
      { q: "Que comprennent les frais de service ?", a: "Des frais de service de 8 % s'ajoutent au prix des nuits. Le détail est affiché avant confirmation." },
    ],
  },
  {
    id: "transferts",
    title: "Transfert aéroport",
    items: [
      { q: "Comment réserver un chauffeur à l'aéroport ?", a: "Depuis « Transfert aéroport » (ou depuis la confirmation de votre séjour) : indiquez votre vol, choisissez le véhicule et payez. Réservez au plus tard 6 heures avant l'atterrissage." },
      { q: "Quand vais-je connaître mon chauffeur ?", a: "Son nom, son numéro et son véhicule vous sont envoyés par email au plus tard la veille de votre arrivée, et apparaissent dans Profil → Mes transferts." },
      { q: "Mon vol a du retard", a: "Le chauffeur attend jusqu'à 60 minutes après l'heure prévue. Au-delà, prévenez-le par appel ou WhatsApp : son numéro figure dans votre transfert." },
      { q: "Puis-je annuler ?", a: "Oui, gratuitement jusqu'à 24 heures avant l'arrivée. Ensuite, le transfert n'est plus remboursé." },
    ],
  },
  {
    id: "compte",
    title: "Mon compte",
    items: [
      { q: "Je n'ai pas reçu mon code de vérification", a: "Vérifiez vos spams, puis utilisez « Renvoyer le code » sur la page de vérification (un nouveau code toutes les 60 secondes). Le code est valable 10 minutes." },
      { q: "J'ai oublié mon mot de passe", a: "Cliquez sur « Mot de passe oublié ? » sur la page de connexion : un code vous est envoyé par e-mail pour choisir un nouveau mot de passe." },
      { q: "Comment devenir hôte ?", a: "Depuis Profil → Devenir hôte, activez votre compte hôte, puis publiez votre logement depuis l'Espace hôte." },
    ],
  },
  {
    id: "conditions",
    title: "Conditions d'utilisation",
    items: [
      { q: "Engagements des voyageurs", a: "Fournir des informations exactes, respecter le logement, le nombre de voyageurs annoncé et le règlement de l'hôte." },
      { q: "Engagements des hôtes", a: "Publier des annonces fidèles (photos, prix, équipements), honorer les réservations confirmées et répondre aux voyageurs." },
    ],
  },
  {
    id: "confidentialite",
    title: "Confidentialité",
    items: [
      { q: "Quelles données sont collectées ?", a: "Nom, e-mail, téléphone (facultatif), vos réservations, favoris et messages. Ces données servent uniquement au fonctionnement du service." },
      { q: "Mon mot de passe est-il protégé ?", a: "Oui : il est stocké sous forme chiffrée (hachée) et n'est jamais visible, y compris par l'équipe Kwa-Ba." },
    ],
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return SECTIONS;
    return SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(term)) })).filter((s) => s.items.length);
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <SubPageHeader title="Centre d'aide" subtitle="Les réponses aux questions les plus fréquentes" />

      <div className="relative mb-8">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher : annulation, code, paiement…"
          className="w-full bg-white rounded-full py-4 pl-14 pr-6 border border-gray-200 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 text-base sm:text-[15px]"
        />
      </div>

      <div className="space-y-8">
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">Aucun résultat pour « {query} ».</p>}
        {filtered.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-28">
            <h2 className="font-heading font-bold text-lg text-dark mb-3">{section.title}</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {section.items.map((item) => {
                const key = `${section.id}-${item.q}`;
                const isOpen = open === key || !!query;
                return (
                  <div key={key}>
                    <button onClick={() => setOpen(isOpen && !query ? null : key)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-gray-50">
                      <span className="font-medium text-dark text-sm sm:text-[15px]">{item.q}</span>
                      <ChevronDown size={18} className={`text-muted flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && <p className="px-4 sm:px-5 pb-5 text-sm text-gray-600 leading-relaxed">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0"><MessageCircle size={22} /></div>
        <div className="flex-1">
          <p className="font-bold text-dark">Une question sur un séjour ?</p>
          <p className="text-sm text-muted">Votre hôte est le mieux placé pour vous répondre.</p>
        </div>
        <Link href="/messages" className="bg-dark text-white font-medium px-5 py-3 rounded-xl hover:bg-black">Mes messages</Link>
      </div>
    </div>
  );
}
