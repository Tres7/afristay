import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import SubPageHeader from "@/components/layout/SubPageHeader";

const ITEMS = [
  { icon: ShieldCheck, title: "Sécurité du compte", desc: "Codes de vérification et de réinitialisation du mot de passe.", channel: "E-mail · obligatoire" },
  { icon: Mail, title: "Bienvenue", desc: "Un e-mail de bienvenue après la vérification de votre compte.", channel: "E-mail" },
  { icon: MessageCircle, title: "Nouveaux messages", desc: "Le compteur de messages non lus s'affiche dans la barre de navigation.", channel: "Sur le site" },
];

export default function NotificationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <SubPageHeader title="Notifications" subtitle="Ce que nous vous envoyons et pourquoi" />

      <div className="bg-white rounded-3xl shadow-card p-5 sm:p-8 space-y-4">
        {ITEMS.map(({ icon: Icon, title, desc, channel }) => (
          <div key={title} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0"><Icon size={20} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-dark">{title}</p>
                <span className="text-xs font-semibold text-muted bg-gray-100 px-2.5 py-1 rounded-full">{channel}</span>
              </div>
              <p className="text-sm text-muted mt-1">{desc}</p>
            </div>
          </div>
        ))}
        <p className="text-sm text-gray-500 pt-2">Kwa-Ba n&apos;envoie aucun e-mail publicitaire.</p>
      </div>
    </div>
  );
}
