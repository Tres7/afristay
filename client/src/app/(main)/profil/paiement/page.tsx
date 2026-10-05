import Link from "next/link";
import { CreditCard, Info, Smartphone, Wallet } from "lucide-react";
import SubPageHeader from "@/components/layout/SubPageHeader";

const METHODS = [
  { icon: Smartphone, title: "Mobile Money", desc: "MTN, Orange, Moov, Wave" },
  { icon: CreditCard, title: "Carte bancaire", desc: "Visa, Mastercard" },
  { icon: Wallet, title: "PayPal", desc: "Avec votre compte PayPal" },
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
          <Info size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <span>
            Vous choisissez votre mode de paiement à chaque réservation. Aucune carte n&apos;est enregistrée sur votre compte et le
            paiement en ligne n&apos;est pas encore activé.{" "}
            <Link href="/profil/aide#paiement" className="text-primary font-semibold hover:underline">En savoir plus</Link>
          </span>
        </p>
      </div>
    </div>
  );
}
