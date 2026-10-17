"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MapPin, Search, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";

type Category = "activites" | "restaurants" | "loisirs" | "sites";

const TABS: { id: Category | "tout"; label: string }[] = [
  { id: "tout", label: "tout" },
  { id: "activites", label: "activites" },
  { id: "restaurants", label: "restaurants" },
  { id: "loisirs", label: "loisirs" },
  { id: "sites", label: "sites" },
];

const U = "https://images.unsplash.com/";
const Q = "?q=80&w=800&auto=format&fit=crop";

// Guide éditorial : idées de sorties près des villes où Kwa-Ba propose des hébergements
const EXPERIENCES: { id: number; name: string; category: Category; tag: string; city: string; country: string; price: string; img: string; desc: string }[] = [
  { id: 1, name: "Excursion à Ganvié", category: "activites", tag: "Culture", city: "Cotonou", country: "Bénin", price: "≈ 15 000 FCFA", img: `${U}photo-1504150558240-0b4fd8946624${Q}`, desc: "Pirogue jusqu'à la « Venise de l'Afrique », village lacustre sur le lac Nokoué." },
  { id: 2, name: "Lac Rose et dunes", category: "activites", tag: "Nature", city: "Dakar", country: "Sénégal", price: "≈ 25 000 FCFA", img: `${U}photo-1509099836639-18ba1795216d${Q}`, desc: "Demi-journée au lac Retba, célèbre pour sa couleur rose, et balade dans les dunes." },
  { id: 3, name: "Balade en dromadaire", category: "activites", tag: "Aventure", city: "Marrakech", country: "Maroc", price: "≈ 30 000 FCFA", img: `${U}photo-1539020140153-e479b8c22e70${Q}`, desc: "Coucher de soleil dans la palmeraie de Marrakech." },
  { id: 4, name: "Plongée à Mnemba", category: "loisirs", tag: "Mer", city: "Zanzibar", country: "Tanzanie", price: "≈ 60 000 FCFA", img: `${U}photo-1544551763-46a013bb70d5${Q}`, desc: "Snorkeling avec tortues et dauphins autour de l'atoll de Mnemba." },
  { id: 5, name: "Plage de Grand-Bassam", category: "loisirs", tag: "Plage", city: "Abidjan", country: "Côte d'Ivoire", price: "Gratuit", img: `${U}photo-1507525428034-b723cf961d3e${Q}`, desc: "Plage et ville historique classée à l'UNESCO, à 40 min d'Abidjan." },
  { id: 6, name: "Marché des fétiches", category: "sites", tag: "Culture", city: "Lomé", country: "Togo", price: "≈ 3 000 FCFA", img: `${U}photo-1489392191049-fc10c97e64b6${Q}`, desc: "Le marché d'Akodessewa, lieu unique dédié à la médecine traditionnelle vaudou." },
  { id: 7, name: "Île de Gorée", category: "sites", tag: "Histoire", city: "Dakar", country: "Sénégal", price: "≈ 5 000 FCFA", img: `${U}photo-1580746738099-b2d4b5d1d2e6${Q}`, desc: "Maison des Esclaves et ruelles colorées, à 20 min de chaloupe de Dakar." },
  { id: 8, name: "Mémorial du génocide", category: "sites", tag: "Histoire", city: "Kigali", country: "Rwanda", price: "Gratuit", img: `${U}photo-1611348524140-53c9a25263d6${Q}`, desc: "Lieu de mémoire incontournable pour comprendre l'histoire du Rwanda." },
  { id: 9, name: "Maquis de Marcory", category: "restaurants", tag: "Ivoirien", city: "Abidjan", country: "Côte d'Ivoire", price: "≈ 5 000 FCFA", img: `${U}photo-1555939594-58d7cb561ad1${Q}`, desc: "Poisson braisé, alloco et attiéké dans l'ambiance des maquis." },
  { id: 10, name: "Thiéboudienne au Point E", category: "restaurants", tag: "Sénégalais", city: "Dakar", country: "Sénégal", price: "≈ 6 000 FCFA", img: `${U}photo-1604329760661-e71dc83f8f26${Q}`, desc: "Le plat national sénégalais dans une adresse familiale." },
  { id: 11, name: "Cours de cuisine marocaine", category: "restaurants", tag: "Atelier", city: "Marrakech", country: "Maroc", price: "≈ 35 000 FCFA", img: `${U}photo-1541518763669-27fef04b14ea${Q}`, desc: "Tajine et pâtisseries avec une cuisinière de la médina." },
  { id: 12, name: "Kakum canopy walk", category: "loisirs", tag: "Nature", city: "Accra", country: "Ghana", price: "≈ 20 000 FCFA", img: `${U}photo-1516426122078-c23e76319801${Q}`, desc: "Passerelles suspendues au-dessus de la forêt tropicale (excursion depuis Accra)." },
];

// Version anglaise du guide (nom, étiquette, pays, description ; prix « Gratuit » → « Free »)
const EN: Record<number, { name: string; tag: string; country: string; desc: string }> = {
  1: { name: "Ganvié excursion", tag: "Culture", country: "Benin", desc: "A pirogue ride to the “Venice of Africa”, a stilt village on Lake Nokoué." },
  2: { name: "Pink Lake and dunes", tag: "Nature", country: "Senegal", desc: "Half a day at Lake Retba, famous for its pink water, and a walk in the dunes." },
  3: { name: "Camel ride", tag: "Adventure", country: "Morocco", desc: "Sunset in the Marrakech palm grove." },
  4: { name: "Diving at Mnemba", tag: "Sea", country: "Tanzania", desc: "Snorkelling with turtles and dolphins around Mnemba atoll." },
  5: { name: "Grand-Bassam beach", tag: "Beach", country: "Côte d'Ivoire", desc: "A beach and UNESCO-listed historic town, 40 minutes from Abidjan." },
  6: { name: "Fetish market", tag: "Culture", country: "Togo", desc: "Akodessewa market, a unique place devoted to traditional voodoo medicine." },
  7: { name: "Gorée Island", tag: "History", country: "Senegal", desc: "The House of Slaves and colourful lanes, 20 minutes by ferry from Dakar." },
  8: { name: "Genocide Memorial", tag: "History", country: "Rwanda", desc: "An essential place of remembrance to understand Rwanda's history." },
  9: { name: "Marcory maquis", tag: "Ivorian", country: "Côte d'Ivoire", desc: "Grilled fish, alloco and attiéké in the lively atmosphere of a maquis." },
  10: { name: "Thieboudienne at Point E", tag: "Senegalese", country: "Senegal", desc: "Senegal's national dish in a family-run restaurant." },
  11: { name: "Moroccan cooking class", tag: "Workshop", country: "Morocco", desc: "Tagine and pastries with a cook from the medina." },
  12: { name: "Kakum canopy walk", tag: "Nature", country: "Ghana", desc: "Suspended walkways above the rainforest (day trip from Accra)." },
};

function localiser(e: (typeof EXPERIENCES)[number], locale: string) {
  if (locale !== "en") return e;
  return { ...e, ...EN[e.id], price: e.price === "Gratuit" ? "Free" : e.price.replace(" FCFA", " FCFA") };
}

const CITIES = Array.from(new Set(EXPERIENCES.map((e) => e.city))).sort();

export default function DecouvrirPage() {
  const t = useTranslations("decouvrir");
  const locale = useLocale();
  const [tab, setTab] = useState<Category | "tout">("tout");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return EXPERIENCES.map((e) => localiser(e, locale)).filter(
      (e) =>
        (tab === "tout" || e.category === tab) &&
        (!city || e.city === city) &&
        (!term || `${e.name} ${e.desc} ${e.tag} ${e.city}`.toLowerCase().includes(term))
    );
  }, [tab, city, q, locale]);

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-2">{t("titre")}</h1>
          <p className="text-gray-500 text-sm md:text-base mb-6">{t("sousTitre")}</p>

          <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
            {TABS.map((o) => (
              <button
                key={o.id}
                role="tab"
                aria-selected={tab === o.id}
                onClick={() => setTab(o.id)}
                className={cn(
                  "relative zone-tactile pb-3 text-[15px] font-bold transition-colors whitespace-nowrap border-b-2",
                  tab === o.id ? "text-primary border-primary" : "text-gray-400 border-transparent hover:text-dark"
                )}
              >
                {t(`onglets.${o.label}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100">
          <Select
            label={t("ville")} value={city} onChange={setCity} className="sm:w-56"
            icon={<MapPin size={16} className="text-primary flex-shrink-0" />}
            options={[{ value: "", label: t("toutesVilles") }, ...CITIES.map((c) => ({ value: c, label: c }))]}
          />
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("rechercher")}
              className="w-full h-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 text-base sm:text-sm text-dark outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-500">
            {t("aucune")}
            <button onClick={() => { setTab("tout"); setCity(""); setQ(""); }} className="block mx-auto mt-3 text-primary font-bold hover:underline">
              {t("reinitialiser")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((e) => (
              <article key={e.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img src={e.img} alt={e.name} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute top-4 left-4 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full text-white bg-primary shadow-sm">{e.tag}</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="font-heading font-bold text-dark text-base leading-tight">{e.name}</h2>
                  <p className="flex items-center gap-1 text-gray-500 text-sm mt-1"><MapPin size={13} className="text-primary" />{e.city}, {e.country}</p>
                  <p className="text-gray-600 text-sm mt-3 leading-relaxed flex-1">{e.desc}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="font-bold text-primary text-sm">{e.price}</span>
                    <Link href={`/recherche?city=${encodeURIComponent(e.city)}`} className="relative zone-tactile flex items-center gap-1 text-sm font-semibold text-dark hover:text-primary">
                      {t("dormirA", { ville: e.city })} <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
