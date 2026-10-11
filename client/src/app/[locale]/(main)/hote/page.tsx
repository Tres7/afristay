"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle, Home, MessageCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { useTranslations } from "next-intl";

const STEPS = [
  { icon: Home, id: "publier" },
  { icon: MessageCircle, id: "echanger" },
  { icon: Wallet, id: "recevoir" },
];

export default function DevenirHotePage() {
  const t = useTranslations("devenirHote");
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const role = session?.user?.role;
  const isHost = role === "hote" || role === "admin";

  const becomeHost = async () => {
    setLoading(true);
    try {
      await api.patch("/v1/users/me/", { role: "hote" });
      await update({ role: "hote" });
      toast.success(t("active"));
      router.push("/hote/espace");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setLoading(false);
    }
  };

  const cta =
    status === "loading" ? null : isHost ? (
      <Link href="/hote/espace" className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:bg-gray-50">{t("acceder")}</Link>
    ) : status === "authenticated" ? (
      <button onClick={becomeHost} disabled={loading} className="bg-white text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:bg-gray-50 disabled:opacity-60">
        {loading ? t("activation") : t("activer")}
      </button>
    ) : (
      <Link href="/register?role=hote" className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:bg-gray-50">{t("creerCompte")}</Link>
    );

  return (
    <div className="bg-light">
      <section className="relative overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2000&auto=format&fit=crop')" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-4">{t("titre")}</h1>
          <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto mb-8">
            {t("sousTitre")}
          </p>
          {cta}
          {status === "unauthenticated" && (
            <p className="text-white/80 text-sm mt-4">
              {t.rich("dejaInscrit", { lien: (x) => <Link href="/login?callbackUrl=/hote" className="font-bold underline">{x}</Link> })}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <h2 className="font-heading font-bold text-dark text-2xl md:text-3xl text-center mb-10">{t("commentCaMarche")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, id }, i) => (
            <div key={id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon size={20} /></span>
                <span className="text-sm font-bold text-muted">{t("etape", { numero: i + 1 })}</span>
              </div>
              <h3 className="font-heading font-bold text-dark text-lg mb-2">{t(`etapes.${id}.titre`)}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t(`etapes.${id}.texte`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-3xl p-6 md:p-8 border border-gray-100">
          <h3 className="font-heading font-bold text-dark text-lg mb-4">{t("ceQuIlFaut")}</h3>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
            {["compte", "photos", "prix", "capacite"].map((cle) => t(`besoins.${cle}`)).map((item) => (
              <li key={item} className="flex items-start gap-2"><CheckCircle size={16} className="text-secondary flex-shrink-0 mt-0.5" />{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
