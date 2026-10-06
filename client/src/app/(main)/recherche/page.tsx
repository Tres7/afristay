"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import PropertyCard from "@/components/hebergement/PropertyCard";
import DateRangeField from "@/components/ui/DateRangeField";
import GuestsField from "@/components/ui/GuestsField";
import Select from "@/components/ui/Select";
import type { Hebergement, Paginated } from "@/types/api/models";

const SORTS = [
  { id: "", label: "Pertinence" },
  { id: "prix_asc", label: "Prix croissant" },
  { id: "prix_desc", label: "Prix décroissant" },
  { id: "note", label: "Meilleures notes" },
];

const TYPES = [
  { id: "", label: "Tous" },
  { id: "hotel", label: "Hôtels" },
  { id: "villa", label: "Villas" },
  { id: "appartement", label: "Appartements" },
  { id: "auberge", label: "Auberges" },
];

const FILTER_KEYS = ["city", "check_in", "check_out", "guests", "type", "sort", "price_min", "price_max"] as const;

function RechercheContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();

  // L'URL est la source de vérité : partageable et compatible bouton retour
  const params = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? ""])) as Record<(typeof FILTER_KEYS)[number], string>;

  const [city, setCity] = useState(params.city);
  const [checkIn, setCheckIn] = useState(params.check_in);
  const [checkOut, setCheckOut] = useState(params.check_out);
  const [guests, setGuests] = useState(params.guests || "1");
  const [priceMin, setPriceMin] = useState(params.price_min);
  const [priceMax, setPriceMax] = useState(params.price_max);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Resynchronise le formulaire quand l'URL change (recherche depuis la navbar, bouton retour…)
  useEffect(() => {
    setCity(searchParams.get("city") ?? "");
    setCheckIn(searchParams.get("check_in") ?? "");
    setCheckOut(searchParams.get("check_out") ?? "");
    setGuests(searchParams.get("guests") || "1");
    setPriceMin(searchParams.get("price_min") ?? "");
    setPriceMax(searchParams.get("price_max") ?? "");
  }, [searchParams]);

  const pushParams = (patch: Partial<Record<(typeof FILTER_KEYS)[number], string>>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const validDates = checkIn && checkOut && checkOut > checkIn;
    pushParams({
      city: city.trim(),
      check_in: validDates ? checkIn : "",
      check_out: validDates ? checkOut : "",
      guests: guests === "1" ? "" : guests,
      price_min: priceMin,
      price_max: priceMax,
    });
    setFiltersOpen(false);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["hebergements", "recherche", searchParams.toString(), status],
    queryFn: async () => {
      const query: Record<string, string> = {};
      for (const k of FILTER_KEYS) if (params[k]) query[k] = params[k];
      return (await api.get<Paginated<Hebergement>>("/v1/hebergements/", { params: query })).data;
    },
    enabled: status !== "loading",
  });

  const results = data?.results ?? [];
  const stayQuery = params.check_in && params.check_out
    ? `?check_in=${params.check_in}&check_out=${params.check_out}&guests=${params.guests || 1}`
    : "";
  const activeCount = [params.type, params.sort, params.price_min, params.price_max].filter(Boolean).length;

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted font-bold uppercase tracking-wider mb-2">Type de logement</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => pushParams({ type: t.id })}
              className={cn("px-3 py-2 rounded-full text-sm border transition-colors", params.type === t.id ? "bg-primary text-white border-primary" : "bg-white text-dark border-gray-200 hover:border-primary/40")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted font-bold uppercase tracking-wider mb-2">Trier par</p>
        <Select
          label="Trier par" value={params.sort}
          onChange={(v) => pushParams({ sort: v })}
          options={SORTS.map((o) => ({ value: o.id, label: o.label }))}
        />
      </div>

      <div>
        <p className="text-xs text-muted font-bold uppercase tracking-wider mb-2">Prix par nuit (FCFA)</p>
        <div className="flex items-center gap-2">
          <input type="number" inputMode="numeric" min={0} placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-full min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-base sm:text-sm text-dark outline-none" />
          <span className="text-muted">—</span>
          <input type="number" inputMode="numeric" min={0} placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-base sm:text-sm text-dark outline-none" />
        </div>
        <button onClick={() => submitSearch()} className="mt-3 w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
          Appliquer
        </button>
      </div>

      {activeCount > 0 && (
        <button
          onClick={() => { setPriceMin(""); setPriceMax(""); pushParams({ type: "", sort: "", price_min: "", price_max: "" }); }}
          className="w-full text-sm font-semibold text-gray-500 hover:text-primary"
        >
          Effacer les filtres
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-light">
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 sm:px-6 py-4">
        <form onSubmit={submitSearch} className="max-w-7xl mx-auto grid grid-cols-2 lg:flex gap-2 sm:gap-3 items-stretch">
          <label className="col-span-2 lg:flex-1 flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-light-muted">
            <Search size={16} className="text-muted flex-shrink-0" />
            <input
              type="text" value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="Destination (ex : Lomé, Dakar, Abidjan…)"
              aria-label="Destination"
              className="flex-1 min-w-0 text-base sm:text-sm text-dark placeholder:text-muted outline-none bg-transparent"
            />
          </label>
          <DateRangeField
            checkIn={checkIn} checkOut={checkOut}
            onChange={(a, d) => { setCheckIn(a); setCheckOut(d); }}
            className="col-span-2 lg:w-[20rem]"
          />
          <GuestsField value={Number(guests) || 1} onChange={(n) => setGuests(String(n))} className="lg:w-48" />
          <button type="submit" className="bg-primary text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-medium text-sm hover:bg-primary-700 transition-colors">
            <Search size={16} />
            Rechercher
          </button>
        </form>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal size={16} className="text-primary" />
                <h2 className="font-heading font-semibold text-dark">Filtres</h2>
              </div>
              {filtersPanel}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-6">
              {isLoading ? (
                <p className="text-muted text-sm">Recherche en cours...</p>
              ) : (
                <p className="text-dark font-medium">
                  <span className="font-heading font-bold text-2xl">{results.length}</span>{" "}
                  hébergement{results.length > 1 ? "s" : ""}
                  {params.city && <span className="text-muted font-normal"> à {params.city}</span>}
                  {params.check_in && params.check_out && <span className="text-muted font-normal text-sm"> · disponibles du {new Date(params.check_in).toLocaleDateString("fr-FR")} au {new Date(params.check_out).toLocaleDateString("fr-FR")}</span>}
                </p>
              )}
              <button onClick={() => setFiltersOpen(true)} className="lg:hidden flex items-center gap-2 border border-gray-200 bg-white rounded-full px-4 py-2 text-sm font-semibold text-dark flex-shrink-0">
                <SlidersHorizontal size={15} /> Filtres{activeCount > 0 && <span className="bg-primary text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">{activeCount}</span>}
              </button>
            </div>

            {isError ? (
              <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                <p className="text-dark font-semibold mb-2">Impossible de charger les hébergements.</p>
                <button onClick={() => refetch()} className="text-primary font-bold hover:underline">Réessayer</button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-72 rounded-2xl skeleton" />)}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-card p-10 sm:p-16 text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Search size={28} className="text-primary" />
                </div>
                <p className="text-dark font-heading font-semibold text-xl mb-2">Aucun résultat</p>
                <p className="text-muted">Essayez une autre destination, d&apos;autres dates ou retirez des filtres.</p>
                <button onClick={() => router.push(pathname)} className="mt-4 text-primary font-bold hover:underline">Voir tous les hébergements</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {results.map((h) => <PropertyCard key={h.id} property={h} query={stayQuery} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Filtres">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-lg text-dark">Filtres</h2>
              <button onClick={() => setFiltersOpen(false)} className="p-2 -mr-2" aria-label="Fermer"><X size={20} /></button>
            </div>
            {filtersPanel}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-light flex items-center justify-center"><p className="text-muted">Chargement...</p></div>}>
      <RechercheContent />
    </Suspense>
  );
}
