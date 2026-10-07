import Link from "next/link";
import { CreditCard, Lock, Smartphone, Wallet } from "lucide-react";
import SubPageHeader from "@/components/layout/SubPageHeader";

const METHODS = [
  { icon: Smartphone, title: "Mobile Money", desc: "Moov Money (Flooz), Mixx by Yas (T-Money), MTN, Orange, Airtel… via FedaPay" },
  { icon: CreditCard, title: "Carte bancaire", desc: "Visa, Mastercard, via FedaPay" },
  { icon: Wallet, title: "PayPal", desc: "Compte PayPal ou carte, débité en euros (1 € = 655,957 FCFA)" },
];

export default function PaymentMethodsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <SubPageHeader title="Moyens de paiement" subtitle="Les modes de paiement acceptés sur AfriStay" />

      <div className="bg-white rounded-3xl shadow-card p-5 sm:p-8 space-y-4">
        {METHODS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Icon size={22} /></div>
            <div>
              <p className="font-bold text-dark">{title}</p>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          </div>
        ))}

        <p className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 rounded-2xl p-4">
          <Lock size={18} className="text-secondary flex-shrink-0 mt-0.5" />
          <span>
            Vous choisissez votre moyen de paiement à chaque réservation, puis vous payez sur la page sécurisée de FedaPay ou de
            PayPal. AfriStay ne voit ni n&apos;enregistre vos coordonnées bancaires ou votre code Mobile Money. L&apos;hôte n&apos;est payé
            qu&apos;après votre arrivée.{" "}
            <Link href="/remboursement" className="text-primary font-semibold hover:underline">En savoir plus sur le paiement et le remboursement</Link>
          </span>
        </p>
      </div>
    </div>
  );
}
