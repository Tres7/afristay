"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Shield, Smartphone, CreditCard, Wallet, MapPin } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import api from "@/lib/api";

interface Hebergement {
  id: string;
  name: string;
  city: string;
  location: string;
  image_url: string;
  rating: number;
  price_per_night: number;
}

const paymentMethods = [
  { id: "mobile_money", label: "Mobile Money", sublabel: "MTN, Orange, Wave", icon: Smartphone },
  { id: "carte", label: "Carte bancaire", sublabel: "Visa, Mastercard", icon: CreditCard },
  { id: "paypal", label: "PayPal", sublabel: "Compte PayPal", icon: Wallet },
];

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function ReservationContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const checkIn = searchParams.get("check_in") || "";
  const checkOut = searchParams.get("check_out") || "";
  const guestsCount = parseInt(searchParams.get("guests") || "1");

  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hebergement, setHebergement] = useState<Hebergement | null>(null);

  useEffect(() => {
    api.get(`/v1/hebergements/${params.id}/`)
      .then((res) => setHebergement(res.data))
      .catch(() => router.push("/"));
  }, [params.id, router]);

  if (!hebergement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  const nights = calculateNights(checkIn, checkOut);
  const subtotal = hebergement.price_per_night * nights;
  const serviceFee = Math.round(subtotal * 0.08);
  const total = subtotal + serviceFee;

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const handlePay = async () => {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    try {
      const res = await api.post("/v1/reservations/", {
        hebergement: hebergement.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guestsCount,
        payment_method: paymentMethod,
        message,
      });
      router.push(`/reservation/confirmation/${res.data.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      alert("Erreur lors de la r\u00e9servation. " + JSON.stringify(error.response?.data || ""));
    } finally {
      setLoading(false);
    }
  };

  const heroImage = hebergement.image_url || "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=600&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-dark hover:text-primary transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-heading font-bold text-dark text-xl">Confirmer et payer</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-6">Votre voyage</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-dark text-sm">Dates</p>
                    <p className="text-gray-500 text-sm mt-0.5">{formatDate(checkIn)} \u2013 {formatDate(checkOut)} ({nights} nuit{nights > 1 ? "s" : ""})</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-dark text-sm">Voyageurs</p>
                    <p className="text-gray-500 text-sm mt-0.5">{guestsCount} adulte{guestsCount > 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-6">Informations voyageur</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Pr\u00e9nom</label>
                  <input type="text" defaultValue={session?.user?.name?.split(" ")[0] ?? ""} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Nom</label>
                  <input type="text" defaultValue={session?.user?.name?.split(" ").slice(1).join(" ") ?? ""} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Email</label>
                  <input type="email" defaultValue={session?.user?.email ?? ""} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">T\u00e9l\u00e9phone</label>
                  <input type="tel" placeholder="+229 XX XX XX XX" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Message \u00e0 l&apos;h\u00f4te (optionnel)</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Informations suppl\u00e9mentaires pour votre h\u00f4te..." rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-dark outline-none focus:border-primary/50 transition-colors resize-none" />
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-heading font-bold text-dark text-xl mb-6">Payer avec</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.id;
                  return (
                    <button key={method.id} onClick={() => setPaymentMethod(method.id)} className={cn("w-full flex items-center gap-4 rounded-2xl p-5 border transition-all", isActive ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 hover:border-primary/30")}>
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                        <Icon size={22} />
                      </div>
                      <div className="text-left flex-1">
                        <p className={cn("font-bold text-sm", isActive ? "text-primary" : "text-dark")}>{method.label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{method.sublabel}</p>
                      </div>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isActive ? "border-primary bg-primary" : "border-gray-300")}>
                        {isActive && <Check size={10} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex items-center gap-3 text-gray-500 text-sm px-2">
              <Shield size={16} className="text-green-500 flex-shrink-0" />
              <p>Paiement s\u00e9curis\u00e9. Vos donn\u00e9es sont prot\u00e9g\u00e9es par un chiffrement SSL 256 bits.</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 sticky top-28">
              <div className="flex gap-4 pb-6 border-b border-gray-100">
                <div className="w-24 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={heroImage} alt={hebergement.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-dark text-sm">{hebergement.name}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                    <MapPin size={12} className="text-primary" />
                    {hebergement.location}, {hebergement.city}
                  </div>
                  <p className="text-xs font-bold text-dark mt-1">\u2b50 {hebergement.rating.toFixed(1)}</p>
                </div>
              </div>

              <div className="py-6 space-y-3 border-b border-gray-100">
                <h3 className="font-heading font-bold text-dark text-base mb-4">D\u00e9tails du prix</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{hebergement.price_per_night.toLocaleString()} FCFA \u00d7 {nights} nuit{nights > 1 ? "s" : ""}</span>
                  <span className="font-medium text-dark">{subtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frais de service (8%)</span>
                  <span className="font-medium text-dark">{serviceFee.toLocaleString()} FCFA</span>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-center mb-6">
                <span className="font-heading font-bold text-dark text-lg">Total</span>
                <span className="font-heading font-bold text-primary text-2xl">{total.toLocaleString()} FCFA</span>
              </div>

              <button onClick={handlePay} disabled={loading || nights === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-md transition-all text-base disabled:opacity-60">
                {loading ? "Traitement..." : `Payer ${total.toLocaleString()} FCFA`}
              </button>

              <p className="text-center text-gray-400 text-xs mt-4 leading-relaxed">
                En confirmant, vous acceptez nos <a href="#" className="text-primary font-medium">Conditions</a> et la <a href="#" className="text-primary font-medium">Politique de confidentialit\u00e9</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    }>
      <ReservationContent />
    </Suspense>
  );
}
