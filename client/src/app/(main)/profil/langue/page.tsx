import { Check, Globe } from "lucide-react";
import SubPageHeader from "@/components/layout/SubPageHeader";

export default function LanguagePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <SubPageHeader title="Langue & région" subtitle="Préférences d'affichage" />

      <div className="bg-white rounded-3xl shadow-card p-5 sm:p-8 space-y-8">
        <section>
          <h2 className="font-heading font-semibold text-lg text-dark mb-4 flex items-center gap-2"><Globe size={18} className="text-primary" /> Langue</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-primary bg-primary/5">
              <div>
                <p className="font-bold text-dark">Français</p>
                <p className="text-sm text-muted">Afrique francophone</p>
              </div>
              <Check size={18} className="text-primary" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 opacity-60">
              <div>
                <p className="font-bold text-dark">English</p>
                <p className="text-sm text-muted">Bientôt disponible</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-lg text-dark mb-4">Devise</h2>
          <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-primary bg-primary/5 sm:max-w-sm">
            <div>
              <p className="font-bold text-dark">Franc CFA (FCFA)</p>
              <p className="text-sm text-muted">Tous les prix sont affichés en FCFA</p>
            </div>
            <Check size={18} className="text-primary" />
          </div>
        </section>
      </div>
    </div>
  );
}
