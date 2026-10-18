"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Briefcase, Car, ChevronLeft, ChevronRight, Fuel, Snowflake, Users } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import api, { apiErrorMessage } from "@/lib/api";
import Select from "@/components/ui/Select";
import Stepper from "@/components/ui/Stepper";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { CatalogueLocation, CategorieVehicule, DevisLocation, Formule, Location } from "@/types/api/location";

const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base sm:text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const labelClass = "block text-xs font-bold text-dark uppercase tracking-wide mb-2";

/** Date et heure locales au format des champs datetime-local, `jours` jours après maintenant. */
function dansJours(jours: number, heure = "10:00") {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${heure}`;
}

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={actif} onClick={onClick}
      className={cn("relative zone-tactile px-4 py-2 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap",
        actif ? "bg-primary text-white border-primary" : "bg-white text-dark border-gray-200 hover:border-primary/40")}>
      {children}
    </button>
  );
}

/** Photos du véhicule : défilement au doigt (aimanté), flèches au survol sur ordinateur, points de position. */
function Galerie({ photos, nom }: { photos: string[]; nom: string }) {
  const t = useTranslations("location");
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (!photos.length) return <Car size={56} className="text-gray-300" aria-hidden />;
  const aller = (i: number) => rail.current?.scrollTo({ left: i * rail.current.clientWidth, behavior: "smooth" });
  const fleche = "absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-dark shadow flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity";
  return (
    <div className="relative w-full h-full group">
      <div ref={rail} className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={photos.length > 1 ? t("photoNumero", { nom, numero: i + 1, total: photos.length }) : ""}
            loading={i ? "lazy" : undefined} className="w-full h-full flex-shrink-0 object-cover snap-center" />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          {index > 0 && <button type="button" onClick={() => aller(index - 1)} aria-label={t("photoPrecedente")} className={cn(fleche, "left-2")}><ChevronLeft size={18} aria-hidden /></button>}
          {index < photos.length - 1 && <button type="button" onClick={() => aller(index + 1)} aria-label={t("photoSuivante")} className={cn(fleche, "right-2")}><ChevronRight size={18} aria-hidden /></button>}
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5" aria-hidden>
            {photos.map((src, i) => <span key={src} className={cn("w-1.5 h-1.5 rounded-full transition-colors", i === index ? "bg-white" : "bg-white/50")} />)}
          </div>
        </>
      )}
    </div>
  );
}

function CarteVehicule({ c, formule, onChoisir }: { c: CategorieVehicule; formule: Formule; onChoisir: () => void }) {
  const t = useTranslations("location");
  const prix = c.prix_jour[formule];
  return (
    <article className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="h-40 bg-gray-50 flex items-center justify-center">
        <Galerie photos={c.photos?.length ? c.photos : c.image ? [c.image] : []} nom={c.nom} />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{t(`gammes.${c.gamme}`)}</p>
        <h2 className="font-heading font-bold text-dark text-lg mt-1">{c.nom}</h2>
        {c.exemple_modele && <p className="text-sm text-gray-500">{c.exemple_modele}</p>}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-3">
          <li className="flex items-center gap-1.5"><Users size={15} /> {t("places", { nombre: c.places })}</li>
          <li className="flex items-center gap-1.5"><Briefcase size={15} /> {t("bagages", { nombre: c.bagages })}</li>
          <li>{t(`boites.${c.boite}`)}</li>
          <li className="flex items-center gap-1.5"><Fuel size={15} /> {t(`carburants.${c.carburant}`)}</li>
          {c.climatisation && <li className="flex items-center gap-1.5"><Snowflake size={15} /> {t("clim")}</li>}
        </ul>
        <div className="flex items-end justify-between gap-3 mt-auto pt-4">
          {prix !== null ? (
            <p className="font-heading font-bold text-dark text-xl">{formatPrice(prix)}<span className="text-xs font-normal text-gray-500">{t("parJour")}</span></p>
          ) : (
            <p className="text-sm text-gray-400">{t("nonProposee")}</p>
          )}
          <button onClick={onChoisir} disabled={prix === null}
            className="relative zone-tactile flex items-center gap-1 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-40">
            {t("choisir")} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function FormulaireLocation({ catalogue, categorie, formule, onChanger }: {
  catalogue: CatalogueLocation; categorie: CategorieVehicule; formule: Formule; onChanger: () => void;
}) {
  const t = useTranslations("location");
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const lieux = catalogue.lieux ?? [];
  const regles = catalogue.regles!;
  const [lieuPrise, setLieuPrise] = useState(String(lieux[0]?.id ?? ""));
  const [lieuRetour, setLieuRetour] = useState(String(lieux[0]?.id ?? ""));
  const [adressePrise, setAdressePrise] = useState("");
  const [adresseRetour, setAdresseRetour] = useState("");
  const [debut, setDebut] = useState(dansJours(regles.delai_min_jours + 1));
  const [fin, setFin] = useState(dansJours(regles.delai_min_jours + 4));
  const [passagers, setPassagers] = useState(Math.min(2, categorie.places));
  const [telephone, setTelephone] = useState("");
  const [precisions, setPrecisions] = useState("");
  const [conducteur, setConducteur] = useState("");
  const [permisNumero, setPermisNumero] = useState("");
  const [permisPays, setPermisPays] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const prise = lieux.find((l) => String(l.id) === lieuPrise);
  const retour = lieux.find((l) => String(l.id) === lieuRetour);
  const optionsLieux = lieux.map((l) => ({ value: String(l.id), label: l.nom, hint: l.frais ? `+ ${formatPrice(l.frais)}` : undefined }));

  const devis = useQuery({
    queryKey: ["location", "devis", categorie.id, formule, lieuPrise, lieuRetour, debut, fin],
    queryFn: async () => (await api.get<DevisLocation>("/v1/locations/devis/", {
      params: { categorie: categorie.id, formule, lieu_prise: lieuPrise, lieu_retour: lieuRetour, debut, fin },
    })).data,
    enabled: !!(lieuPrise && debut && fin),
    retry: false,
  });

  const reserver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    setEnvoi(true);
    try {
      const res = await api.post<Location>("/v1/locations/", {
        categorie: categorie.id, formule, lieu_prise: Number(lieuPrise), lieu_retour: Number(lieuRetour),
        adresse_prise: adressePrise, adresse_retour: adresseRetour, debut, fin, passagers, telephone, precisions,
        conducteur, permis_numero: permisNumero, permis_pays: permisPays,
      });
      router.push(`/location/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setEnvoi(false);
    }
  };

  const erreurDevis = devis.error ? apiErrorMessage(devis.error) : null;

  return (
    <form method="post" onSubmit={reserver} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-dark text-xl">{t("reserverTitre", { nom: categorie.nom })}</h2>
          <p className="text-sm text-gray-500">{t(`formules.${formule}`)} · {categorie.exemple_modele}</p>
        </div>
        <button type="button" onClick={onChanger} className="text-sm font-semibold text-primary hover:underline">{t("changer")}</button>
      </div>

      <p className="text-sm bg-amber-50 text-amber-900 rounded-xl px-4 py-3">{t("delai", { jours: regles.delai_min_jours })}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {([["prise", lieuPrise, setLieuPrise, prise, adressePrise, setAdressePrise, debut, setDebut],
           ["retour", lieuRetour, setLieuRetour, retour, adresseRetour, setAdresseRetour, fin, setFin]] as const).map(
          ([cle, lieu, setLieu, detail, adresse, setAdresse, date, setDate]) => (
            <fieldset key={cle} className="space-y-3">
              <legend className="font-heading font-bold text-dark mb-1">{t(cle)}</legend>
              <div>
                <p className={labelClass}>{t("lieu")}</p>
                <Select label={t(cle)} value={lieu} onChange={setLieu} options={optionsLieux} />
              </div>
              {detail?.adresse_requise && (
                <label className="block">
                  <span className={labelClass}>{t("adresse")}</span>
                  <input className={inputClass} value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder={t("adressePlaceholder")} required maxLength={255} />
                </label>
              )}
              <label className="block">
                <span className={labelClass}>{t("dateHeure")}</span>
                <input type="datetime-local" className={inputClass} value={date} min={dansJours(regles.delai_min_jours, "00:00")}
                  onChange={(e) => setDate(e.target.value)} required />
              </label>
            </fieldset>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className={labelClass}>{t("passagers")}</p>
          <Stepper className="border border-gray-200 rounded-xl px-4 py-2.5 bg-white" label={t("passagers")} value={passagers}
            min={1} max={categorie.places} onChange={setPassagers} />
        </div>
        <label className="block">
          <span className={labelClass}>{t("telephone")}</span>
          <input type="tel" className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+228 90 00 00 00" required />
        </label>
      </div>

      {formule === "sans_chauffeur" && (
        <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <legend className="font-heading font-bold text-dark mb-3 sm:col-span-3">{t("conducteurTitre")}</legend>
          <label className="block"><span className={labelClass}>{t("conducteur")}</span><input className={inputClass} value={conducteur} onChange={(e) => setConducteur(e.target.value)} required maxLength={120} /></label>
          <label className="block"><span className={labelClass}>{t("permisNumero")}</span><input className={inputClass} value={permisNumero} onChange={(e) => setPermisNumero(e.target.value)} required maxLength={40} /></label>
          <label className="block"><span className={labelClass}>{t("permisPays")}</span><input className={inputClass} value={permisPays} onChange={(e) => setPermisPays(e.target.value)} required maxLength={60} /></label>
        </fieldset>
      )}

      <label className="block">
        <span className={labelClass}>{t("precisions")}</span>
        <span className="block text-xs text-gray-500 -mt-1 mb-2">{t("precisionsAide")}</span>
        <textarea rows={4} className={cn(inputClass, "resize-y")} value={precisions} onChange={(e) => setPrecisions(e.target.value)}
          placeholder={t("precisionsPlaceholder")} required minLength={15} maxLength={2000} />
      </label>

      {(regles.conditions || regles.annulation_gratuite_heures) && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 space-y-1">
          <p className="font-bold text-dark">{t("conditions")}</p>
          {regles.conditions && <p className="whitespace-pre-line">{regles.conditions}</p>}
          <p>{t("annulationRegle", { heures: regles.annulation_gratuite_heures })}</p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-5" aria-live="polite">
        {devis.isFetching ? (
          <p className="text-sm text-gray-500">{t("calcul")}</p>
        ) : erreurDevis ? (
          <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{erreurDevis}</p>
        ) : devis.data ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">{t("devisJours", { nombre: devis.data.jours, prix: formatPrice(devis.data.prix_jour) })}</dt><dd>{formatPrice(devis.data.prix_jour * devis.data.jours)}</dd></div>
            {devis.data.frais_lieux > 0 && <div className="flex justify-between"><dt className="text-gray-600">{t("frais")}</dt><dd>{formatPrice(devis.data.frais_lieux)}</dd></div>}
            {devis.data.caution_en_ligne && <div className="flex justify-between"><dt className="text-gray-600">{t("cautionLigne")}</dt><dd>{formatPrice(devis.data.caution)}</dd></div>}
            <div className="flex justify-between pt-2 font-heading font-bold text-dark text-lg"><dt>{t("total")}</dt><dd>{formatPrice(devis.data.a_payer)}</dd></div>
            {devis.data.caution_en_ligne ? (
              <p className="text-xs text-gray-500 pt-1">{t("cautionEnLigne", { heures: regles.restitution_caution_heures })}</p>
            ) : devis.data.caution > 0 && <p className="text-xs text-gray-500 pt-1">{t("caution", { montant: formatPrice(devis.data.caution) })}</p>}
          </dl>
        ) : null}
        <button type="submit" disabled={envoi || !devis.data}
          className="mt-5 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-secondary text-white font-bold disabled:opacity-50">
          {envoi ? t("envoi") : status === "authenticated" ? t("reserver") : t("connexion")}
        </button>
      </div>
    </form>
  );
}

function MesLocations() {
  const t = useTranslations("location");
  const { status } = useSession();
  const { data } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => (await api.get<{ results: Location[] }>("/v1/locations/")).data.results,
    enabled: status === "authenticated",
  });
  if (!data?.length) return null;
  return (
    <section className="mt-12">
      <h2 className="font-heading font-bold text-dark text-xl mb-4">{t("mesLocations")}</h2>
      <ul className="space-y-3">
        {data.map((l) => (
          <li key={l.id}>
            <Link href={`/location/${l.id}`} className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30">
              <span className="min-w-0">
                <span className="block font-semibold text-dark truncate">{l.categorie_detail.nom} · {l.lieu_prise_detail.ville}</span>
                <span className="block text-sm text-gray-500">{formatDate(l.debut_locale)} → {formatDate(l.fin_locale)} · <span className="font-mono text-xs">{l.reference}</span></span>
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-dark whitespace-nowrap">{t(`statuts.${l.statut}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Location de voitures : catalogue administré, filtres, demande détaillée et paiement en ligne. */
export default function LocationPage() {
  const t = useTranslations("location");
  const tNav = useTranslations("nav");
  const [formule, setFormule] = useState<Formule>("avec_chauffeur");
  const [gamme, setGamme] = useState<string | null>(null);
  const [boite, setBoite] = useState<string | null>(null);
  const [placesMin, setPlacesMin] = useState<number | null>(null);
  const [choix, setChoix] = useState<CategorieVehicule | null>(null);

  const { data: catalogue, isLoading } = useQuery({
    queryKey: ["location", "catalogue"],
    queryFn: async () => (await api.get<CatalogueLocation>("/v1/locations/catalogue/")).data,
  });

  const categories = useMemo(() => catalogue?.categories ?? [], [catalogue]);
  const gammes = (catalogue?.filtres?.gammes ?? []).filter((g) => categories.some((c) => c.gamme === g.code));
  const paliersPlaces = [5, 7, 9].filter((n) => categories.some((c) => c.places >= n));
  const visibles = categories.filter((c) =>
    (!gamme || c.gamme === gamme) && (!boite || c.boite === boite) && (!placesMin || c.places >= placesMin));

  return (
    <div className="bg-light min-h-[70vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <h1 className="font-heading font-bold text-dark text-3xl sm:text-4xl">{t("titre")}</h1>
        <p className="text-gray-600 mt-2 max-w-2xl">{t("sousTitre")}</p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">{[0, 1, 2].map((i) => <div key={i} className="h-80 skeleton rounded-3xl" />)}</div>
        ) : !catalogue?.active ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center mt-8">
            <Car size={40} className="mx-auto text-primary" aria-hidden />
            <p className="font-heading font-bold text-dark text-xl mt-4">{t("bientot")}</p>
            <p className="text-gray-600 mt-2">{t("bientotAide")}</p>
            <Link href="/transfert" className="inline-block mt-5 px-6 py-3 rounded-xl bg-primary text-white font-bold">{tNav("transfertAeroport")}</Link>
          </div>
        ) : choix ? (
          <div className="mt-8">
            <FormulaireLocation catalogue={catalogue} categorie={choix} formule={formule} onChanger={() => setChoix(null)} />
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-4">
              <div className="inline-flex bg-white border border-gray-200 rounded-full p-1" role="group" aria-label={t("formule")}>
                {(["avec_chauffeur", "sans_chauffeur"] as const).map((f) => (
                  <button key={f} type="button" aria-pressed={formule === f} onClick={() => setFormule(f)}
                    className={cn("relative zone-tactile px-5 py-2 rounded-full text-sm font-bold transition-colors", formule === f ? "bg-primary text-white" : "text-dark")}>
                    {t(`formules.${f}`)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <Puce actif={!gamme} onClick={() => setGamme(null)}>{t("tous")}</Puce>
                {gammes.map((g) => <Puce key={g.code} actif={gamme === g.code} onClick={() => setGamme(g.code)}>{t(`gammes.${g.code}`)}</Puce>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["automatique", "manuelle"] as const).filter((b) => categories.some((c) => c.boite === b)).map((b) => (
                  <Puce key={b} actif={boite === b} onClick={() => setBoite(boite === b ? null : b)}>{t(`boites.${b}`)}</Puce>
                ))}
                {paliersPlaces.map((n) => (
                  <Puce key={n} actif={placesMin === n} onClick={() => setPlacesMin(placesMin === n ? null : n)}>{t("placesMin", { nombre: n })}</Puce>
                ))}
              </div>
            </div>

            {visibles.length === 0 ? (
              <p className="bg-white rounded-3xl border border-gray-100 p-10 text-center text-gray-500 mt-6">{t("aucun")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                {visibles.map((c) => <CarteVehicule key={c.id} c={c} formule={formule} onChoisir={() => { setChoix(c); window.scrollTo({ top: 0, behavior: "smooth" }); }} />)}
              </div>
            )}
          </>
        )}

        <MesLocations />
      </div>
    </div>
  );
}
