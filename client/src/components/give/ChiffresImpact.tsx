import { formatPrice } from "@/lib/utils";
import type { Impact } from "@/types/api/give";

/** Collecté / reversé / en attente : la transparence en trois chiffres. */
export default function ChiffresImpact({ impact, clair = false }: { impact: Impact; clair?: boolean }) {
  const cases = [
    { label: "Collectés pour les ONG", valeur: formatPrice(impact.collecte) },
    { label: "Déjà reversés", valeur: formatPrice(impact.reverse) },
    { label: "À reverser", valeur: formatPrice(impact.en_attente) },
    { label: "Dons", valeur: impact.nb_dons.toLocaleString("fr-FR") },
  ];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cases.map((c) => (
        <div key={c.label} className={clair ? "bg-white/10 rounded-2xl p-4" : "bg-white rounded-2xl border border-gray-100 p-4"}>
          <dt className={clair ? "text-xs text-white/80" : "text-xs text-gray-600"}>{c.label}</dt>
          <dd className={clair ? "font-heading font-bold text-lg text-white mt-1" : "font-heading font-bold text-lg text-dark mt-1"}>{c.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
