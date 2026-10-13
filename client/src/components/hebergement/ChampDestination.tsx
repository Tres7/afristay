"use client";

import { Fragment, useId, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, Home, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { useDebounced } from "@/lib/useAdminList";
import { cn } from "@/lib/utils";
import type { City } from "@/types/api/models";

interface Suggestions {
  villes: { city: string; count: number }[];
  logements: { id: string; name: string; city: string; image_url: string }[];
}

type Option =
  | { type: "ville"; city: string; count: number }
  | { type: "logement"; id: string; name: string; city: string; image_url: string };

interface ChampDestinationProps {
  value: string;
  onChange: (valeur: string) => void;
  /** Ville choisie dans la liste (le parent lance la recherche ou garde la ville pour la suite du formulaire). */
  onVille: (ville: string) => void;
  /** Appelé après l'ouverture d'un logement proposé. */
  onLogement?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  type?: "text" | "search";
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
  /** Position de la liste sous le champ (largeur, alignement). */
  listeClassName?: string;
}

/** Champ « destination » avec propositions au fil de la saisie : villes (« lome » trouve « Lomé ») puis logements. */
export default function ChampDestination({
  value, onChange, onVille, onLogement, placeholder, ariaLabel, type = "text", inputRef, className, inputClassName, listeClassName,
}: ChampDestinationProps) {
  const t = useTranslations("suggestions");
  const router = useRouter();
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);

  const saisie = useDebounced(value.trim(), 200);
  const { data: trouvees } = useQuery({
    queryKey: ["suggestions", saisie],
    queryFn: async () => (await api.get<Suggestions>("/v1/hebergements/suggestions/", { params: { q: saisie } })).data,
    enabled: ouvert && saisie.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  // Champ vide : destinations populaires (même requête que la page d'accueil, donc souvent déjà en cache)
  const { data: populaires = [] } = useQuery({
    queryKey: ["villes"],
    queryFn: async () => (await api.get<{ results: City[] }>("/v1/hebergements/villes/")).data.results,
    enabled: ouvert && !value.trim(),
  });

  const options: Option[] = value.trim()
    ? [
        ...(trouvees?.villes ?? []).map((v) => ({ type: "ville" as const, ...v })),
        ...(trouvees?.logements ?? []).map((l) => ({ type: "logement" as const, ...l })),
      ]
    : populaires.slice(0, 6).map((v) => ({ type: "ville" as const, city: v.city, count: v.count }));
  const visible = ouvert && options.length > 0;

  const choisir = (option: Option) => {
    setOuvert(false);
    setActif(-1);
    if (option.type === "ville") {
      onChange(option.city);
      onVille(option.city);
    } else {
      router.push(`/hebergements/${option.id}`);
      onLogement?.();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault();
      setOuvert(true);
      const pas = e.key === "ArrowDown" ? 1 : -1;
      // -1 = retour au texte saisi, puis on boucle
      setActif((i) => {
        const suivant = i + pas;
        return suivant < -1 ? options.length - 1 : suivant >= options.length ? -1 : suivant;
      });
    } else if (e.key === "Enter" && visible && actif >= 0 && actif < options.length) {
      // Proposition surlignée au clavier : on la choisit au lieu d'envoyer le formulaire
      e.preventDefault();
      choisir(options[actif]);
    } else if (e.key === "Escape" && visible) {
      e.preventDefault();
      setOuvert(false);
    }
  };

  const villes = options.filter((o) => o.type === "ville");
  const titre = (texte: string) => <li role="presentation" className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{texte}</li>;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOuvert(true); setActif(-1); }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={`${id}-liste`}
        aria-activedescendant={visible && actif >= 0 && actif < options.length ? `${id}-${actif}` : undefined}
        autoComplete="off"
        className={inputClassName}
      />
      {visible && (
        <ul
          id={`${id}-liste`}
          role="listbox"
          aria-label={ariaLabel}
          // Garde le focus dans le champ : sans ça, le blur fermerait la liste avant le clic
          onMouseDown={(e) => e.preventDefault()}
          className={cn("absolute top-full z-50 mt-3 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white pb-2 text-left shadow-card", listeClassName ?? "left-0 w-full min-w-[18rem]")}
        >
          {villes.length > 0 && titre(value.trim() ? t("villes") : t("populaires"))}
          {options.map((option, index) => (
            <Fragment key={option.type === "ville" ? `v-${option.city}` : `l-${option.id}`}>
              {option.type === "logement" && index === villes.length && titre(t("logements"))}
              <li
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === actif}
                onClick={() => choisir(option)}
                onMouseEnter={() => setActif(index)}
                className={cn("mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2", index === actif && "bg-primary/5")}
              >
                {option.type === "ville" ? (
                  <>
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-primary"><MapPin size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-dark">{option.city}</span>
                      <span className="block text-xs text-gray-500">{t("logementsDispo", { nombre: option.count })}</span>
                    </span>
                  </>
                ) : (
                  <>
                    {option.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={option.image_url} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400"><Home size={16} /></span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-dark">{option.name}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Building2 size={12} /> {option.city}</span>
                    </span>
                  </>
                )}
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
