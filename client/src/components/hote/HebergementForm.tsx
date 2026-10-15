"use client";

import { useCallback, useState } from "react";
import api, { firstErrorMessage } from "@/lib/api";
import { AMENITIES } from "@/components/hebergement/AmenityBadge";
import PhotoUploader from "@/components/hote/PhotoUploader";
import Select from "@/components/ui/Select";
import Stepper from "@/components/ui/Stepper";
import { cn, TYPE_LABELS } from "@/lib/utils";
import type { Hebergement, HebergementType } from "@/types/api/models";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Aide de chaque type de logement : messages annonce.types.<type>

interface HebergementFormProps {
  initial?: Hebergement;
  onSaved: (h: Hebergement) => void;
  onCancel: () => void;
}

const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base sm:text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const labelClass = "block text-xs font-bold text-dark uppercase tracking-wide mb-2";

export default function HebergementForm({ initial, onSaved, onCancel }: HebergementFormProps) {
  const t = useTranslations("annonce");
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "appartement",
    city: initial?.city ?? "",
    location: initial?.location ?? "",
    price_per_night: initial ? String(initial.price_per_night) : "",
    max_guests: initial ? String(initial.max_guests) : "2",
    description: initial?.description ?? "",
    amenities: initial?.amenities ?? [],
  });
  // Photos dans l'ordre d'affichage : la première est la couverture
  const [photos, setPhotos] = useState<string[]>(() => {
    const all = [initial?.image_url, ...(initial?.images ?? [])].filter((u): u is string => !!u);
    return Array.from(new Set(all));
  });
  const [uploading, setUploading] = useState(false);
  // Droits d'auteur et droit à l'image : l'hôte atteste détenir les droits sur les photos publiées
  const [droitsPhotos, setDroitsPhotos] = useState(!!initial);
  const onPhotosChange = useCallback((urls: string[]) => setPhotos(urls), []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const toggleAmenity = (a: string) =>
    setForm((prev) => ({ ...prev, amenities: prev.amenities.includes(a) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a] }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!droitsPhotos) {
      setErrors({ droits: t("erreurDroits") });
      return;
    }
    if (photos.length === 0) {
      setErrors({ photos: t("erreurPhotos") });
      return;
    }
    setSaving(true);
    setErrors({});
    const payload = {
      name: form.name.trim(),
      type: form.type,
      city: form.city.trim(),
      location: form.location.trim(),
      price_per_night: Number(form.price_per_night),
      max_guests: Number(form.max_guests),
      description: form.description.trim(),
      image_url: photos[0],
      images: photos,
      amenities: form.amenities,
    };
    try {
      const res = initial
        ? await api.patch<Hebergement>(`/v1/hebergements/${initial.id}/`, payload)
        : await api.post<Hebergement>("/v1/hebergements/", payload);
      onSaved(res.data);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data ?? {};
      const errs: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        const msg = firstErrorMessage(v);
        if (msg) errs[k] = msg;
      }
      if (!Object.keys(errs).length) errs.detail = t("erreurEnregistrement");
      setErrors(errs);
      setSaving(false);
    }
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-red-600 mt-1.5">{errors[k]}</p>;

  return (
    <form method="post" onSubmit={submit} className="space-y-5">
      {errors.detail && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{errors.detail}</p>}

      <div>
        <label className={labelClass} htmlFor="h-name">{t("titre")}</label>
        <input id="h-name" className={inputClass} value={form.name} onChange={set("name")} placeholder={t("titreExemple")} required maxLength={200} />
        {err("name")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="h-type">{t("type")}</label>
          <Select
            id="h-type" label={t("typeLogement")} value={form.type}
            onChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
            options={(Object.keys(TYPE_LABELS) as HebergementType[]).map((id) => ({ value: id, label: TYPE_LABELS[id], hint: t(`types.${id}`) }))}
          />
        </div>
        <div>
          <p className={labelClass}>{t("capacite")}</p>
          <Stepper
            className="border border-gray-200 rounded-xl px-4 py-2.5 bg-white"
            label={t("voyageursMax")} value={Number(form.max_guests) || 1} min={1} max={50}
            onChange={(n) => setForm((prev) => ({ ...prev, max_guests: String(n) }))}
          />
          {err("max_guests")}
        </div>
        <div>
          <label className={labelClass} htmlFor="h-city">{t("ville")}</label>
          <input id="h-city" className={inputClass} value={form.city} onChange={set("city")} placeholder="Lomé" required maxLength={100} />
          {err("city")}
        </div>
        <div>
          <label className={labelClass} htmlFor="h-location">{t("quartier")}</label>
          <input id="h-location" className={inputClass} value={form.location} onChange={set("location")} placeholder="Bè Kpota" maxLength={200} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="h-price">{t("prix")}</label>
          <input id="h-price" type="number" min={1} step={1} inputMode="numeric" className={inputClass} value={form.price_per_night} onChange={set("price_per_night")} placeholder="35000" required />
          {err("price_per_night")}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="h-desc">{t("description")}</label>
        <textarea id="h-desc" rows={5} className={cn(inputClass, "resize-y")} value={form.description} onChange={set("description")} placeholder={t("descriptionPlaceholder")} />
      </div>

      <div>
        <p className={labelClass}>{t("photos")}</p>
        <p className="text-xs text-gray-500 -mt-1 mb-3">{t("photosAide")}</p>
        <PhotoUploader value={photos} onChange={onPhotosChange} onBusyChange={setUploading} error={errors.photos ?? errors.image_url ?? errors.images} />
        <div className="flex items-start gap-2 mt-4">
          <input
            type="checkbox" id="h-droits" checked={droitsPhotos} onChange={(e) => setDroitsPhotos(e.target.checked)}
            className="mt-1 accent-primary w-4 h-4 flex-shrink-0" aria-describedby={errors.droits ? "h-droits-erreur" : undefined}
          />
          <label htmlFor="h-droits" className="text-xs text-gray-600 leading-relaxed">
            {t.rich("certification", { cgu: (x) => <Link href="/cgu#hotes" target="_blank" className="text-primary underline">{x}<span className="sr-only"> ({t("nouvelOnglet")})</span></Link> })}
          </label>
        </div>
        {errors.droits && <p id="h-droits-erreur" role="alert" className="text-xs text-red-600 mt-1.5">{errors.droits}</p>}
      </div>

      <fieldset>
        <legend className={labelClass}>{t("equipements")}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AMENITIES).map(([id, { label, Icone }]) => {
            const active = form.amenities.includes(id);
            return (
              <button key={id} type="button" aria-pressed={active} onClick={() => toggleAmenity(id)}
                className={cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-colors", active ? "bg-primary text-white border-primary" : "bg-white text-dark border-gray-200 hover:border-primary/40")}>
                <Icone size={18} weight="duotone" aria-hidden /> {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl border border-gray-200 text-dark font-medium hover:bg-gray-50">{t("annuler")}</button>
        <button type="submit" disabled={saving || uploading} className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary-600 disabled:opacity-60">
          {uploading ? t("envoiPhotos") : saving ? t("enregistrement") : initial ? t("enregistrerModifs") : t("publier")}
        </button>
      </div>
    </form>
  );
}
