import Link from "next/link";
import { ArrowLeft, CreditCard, Plus, ShieldCheck } from "lucide-react";

export default function PaymentMethodsPage() {
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
          <h1 className="font-heading font-bold text-3xl text-dark">Modes de paiement</h1>
          <p className="text-muted text-sm mt-1">Gérez vos cartes et moyens de paiement enregistrés</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-lg text-dark">Cartes enregistrées</h2>
          <button className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-600 transition-colors">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-primary/20 bg-primary/5 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-8 bg-dark rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold font-mono italic">VISA</span>
              </div>
              <div>
                <p className="font-medium text-dark flex items-center gap-2">
                  •••• •••• •••• 4242
                  <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Par défaut</span>
                </p>
                <p className="text-sm text-muted mt-0.5">Expire en 12/25</p>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <button className="text-sm text-muted hover:text-red-500 font-medium transition-colors">Supprimer</button>
            </div>
          </div>

          <div className="border border-light bg-white rounded-2xl p-5 flex items-center justify-between hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-red-500 rounded flex items-center justify-center">
                <span className="text-white text-[10px] font-bold font-mono">MasterCard</span>
              </div>
              <div>
                <p className="font-medium text-dark">•••• •••• •••• 8821</p>
                <p className="text-sm text-muted mt-0.5">Expire en 08/26</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-primary hover:text-primary-600 font-medium transition-colors">Définir par défaut</button>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-light flex items-start gap-4 bg-gray-50 rounded-xl p-5">
          <ShieldCheck className="text-green-500 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-medium text-dark text-sm mb-1">Paiements 100% sécurisés</h3>
            <p className="text-xs text-muted leading-relaxed">
              Vos informations de paiement sont cryptées et gérées par notre partenaire certifié PCI-DSS. Nous ne stockons jamais le numéro complet de votre carte sur nos serveurs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
