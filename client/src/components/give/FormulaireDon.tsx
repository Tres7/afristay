"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CalendarClock, CreditCard, Lock, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { calculerDon, dateReversement, useConfigGive } from "@/lib/give";
import { enEuros } from "@/lib/paiement";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { OrganisationDetail } from "@/types/api/give";
import type { MoyenPaiement } from "@/types/api/paiement";

const MOYENS: { id: MoyenPaiement; label: string; icon: typeof Smartphone }[] = [
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { id: "carte", label: "Carte bancaire", icon: CreditCard },
  { id: "paypal", label: "PayPal", icon: Wallet },
];

/** Choix du montant, des frais et du moyen de paiement ; tout ce qui concerne le don est affiché avant de payer. */
export default function FormulaireDon({ organisation, projetId }: { organisation: OrganisationDetail; projetId: string | null }) {
  const pathname = usePathname();
  const { status } = useSession();
  const { data: config } = useConfigGive();
  const [montant, setMontant] = useState(2000);
  const [libre, setLibre] = useState("");
  const [couvreFrais, setCouvreFrais] = useState(true);
  const [partage, setPartage] = useState(false);
  const [moyen, setMoyen] = useState<MoyenPaiement | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  if (!config) return <div className="h-96 skeleton rounded-3xl" />;

  const projet = organisation.projets.find((p) => p.id === projetId) ?? null;
  const valeur = libre ? Number(libre) : montant;
  const valide = Number.isInteger(valeur) && valeur >= config.montant_min && valeur <= config.montant_max;
  const calcul = calculerDon(valide ? valeur : 0, couvreFrais, config.frais_paiement);
  const fraisAjoutes = calculerDon(valide ? valeur : 0, true, config.frais_paiement).frais;
  const moyensDispo = MOYENS.filter((m) => config.moyens.includes(m.id));
  const moyenChoisi = moyen && moyensDispo.some((m) => m.id === moyen) ? moyen : moyensDispo[0]?.id;
  const euros = (fcfa: number) => enEuros(fcfa, config.fcfa_par_euro);

  const donner = async () => {
    if (!valide || !moyenChoisi) return;
    setEnvoi(true);
    setErreur("");
    try {
      const res = await api.post<{ id: string; url: string }>("/v1/give/dons/", {
        organisation: organisation.slug, projet: projet?.id ?? null, montant: valeur,
        couvre_frais: couvreFrais, moyen: moyenChoisi, partage_identite: partage,
      });
      window.location.assign(res.data.url);
    } catch (err) {
      setErreur(apiErrorMessage(err, "Le don n'a pas pu démarrer. Réessayez dans un instant."));
      setEnvoi(false);
    }
  };

  return (
    <section id="don" aria-labelledby="don-titre" className="bg-white rounded-3xl border border-gray-100 shadow-card p-5 sm:p-6 space-y-5 scroll-mt-24">
      <div>
        <h2 id="don-titre" className="font-heading font-bold text-dark text-xl">Faire un don</h2>
        <p className="text-sm text-gray-600 mt-1">
          À <strong className="text-dark">{organisation.nom}</strong>{projet && <> — projet « {projet.titre} »</>}
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-bold text-dark mb-2">Montant</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {config.montants_suggeres.map((m) => {
            const actif = !libre && montant === m;
            return (
              <button key={m} type="button" aria-pressed={actif} onClick={() => { setMontant(m); setLibre(""); }}
                className={cn("rounded-xl border-2 py-2.5 px-2 text-center transition-colors",
                  actif ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/40")}>
                <span className="block font-bold text-dark text-sm">{formatPrice(m)}</span>
                <span className="block text-xs text-gray-600">≈ {euros(m)}</span>
              </button>
            );
          })}
        </div>
        <label htmlFor="don-libre" className="block text-sm text-dark mt-3">Ou un autre montant (FCFA)</label>
        <input id="don-libre" type="number" inputMode="numeric" min={config.montant_min} max={config.montant_max} step={1}
          value={libre} onChange={(e) => setLibre(e.target.value.replace(/\D/g, ""))} placeholder={`Dès ${config.montant_min} FCFA`}
          aria-describedby="don-libre-aide"
          className="mt-1 w-full sm:w-60 rounded-xl border border-gray-200 px-4 py-2.5 text-dark focus:border-primary focus:outline-none" />
        <p id="don-libre-aide" className={cn("text-xs mt-1", libre && !valide ? "text-red-700" : "text-gray-600")}>
          {libre && !valide
            ? `Entre ${formatPrice(config.montant_min)} et ${formatPrice(config.montant_max)}.`
            : libre ? `≈ ${euros(valeur)}` : "Montant libre, sans engagement."}
        </p>
      </fieldset>

      <label className="flex items-start gap-3 rounded-2xl bg-light p-4 cursor-pointer">
        <input type="checkbox" checked={couvreFrais} onChange={(e) => setCouvreFrais(e.target.checked)} className="mt-1 accent-primary w-4 h-4" />
        <span className="text-sm text-dark">
          <strong>J&apos;ajoute les frais de paiement ({formatPrice(fraisAjoutes)})</strong>
          {" "}pour que {organisation.nom} reçoive 100 % de mon don.
          <span className="block text-xs text-gray-600 mt-0.5">
            Ces frais ({Math.round(config.frais_paiement * 100)} %) sont prélevés par les services de paiement. Kwa-Ba ne prend aucune commission.
          </span>
        </span>
      </label>

      <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100 text-sm" aria-live="polite">
        <h3 className="px-4 py-3 font-heading font-bold text-dark">Avant de payer</h3>
        <dl className="px-4 py-3 space-y-1.5">
          <div className="flex justify-between gap-3"><dt className="text-gray-600">Bénéficiaire</dt><dd className="font-semibold text-dark text-right">{organisation.nom}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600">Votre don</dt><dd className="text-dark">{formatPrice(valide ? valeur : 0)}</dd></div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Frais de paiement</dt>
            <dd className="text-dark">{couvreFrais ? `+ ${formatPrice(calcul.frais)}` : `${formatPrice(calcul.frais)} déduits`}</dd>
          </div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600">Commission Kwa-Ba</dt><dd className="text-dark">0 FCFA</dd></div>
          <div className="flex justify-between gap-3 pt-1.5 border-t border-gray-100">
            <dt className="font-bold text-dark">Vous payez</dt>
            <dd className="font-bold text-dark">{formatPrice(calcul.total)}{moyenChoisi === "paypal" && <> ({euros(calcul.total)})</>}</dd>
          </div>
          <div className="flex justify-between gap-3"><dt className="font-bold text-primary">L&apos;ONG reçoit</dt><dd className="font-bold text-primary">{formatPrice(calcul.montantOng)}</dd></div>
        </dl>
        <p className="flex gap-2 px-4 py-3 text-gray-600">
          <CalendarClock size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <span>Kwa-Ba encaisse votre don et le reverse à l&apos;ONG au plus tard le <strong className="text-dark">{formatDate(dateReversement(config.jour_reversement).toISOString())}</strong>. Vous recevez un email à ce moment-là, et la preuve du virement est publiée sur cette page.</span>
        </p>
        <p className="flex gap-2 px-4 py-3 text-gray-600">
          <ShieldCheck size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <span>
            Vos données : votre nom et votre email servent à vous envoyer la confirmation et le suivi du don.
            Ils ne sont transmis à l&apos;ONG que si vous cochez la case ci-dessous. Vos coordonnées de paiement restent chez FedaPay ou PayPal.{" "}
            <Link href="/confidentialite" className="font-semibold text-primary hover:underline">Politique de confidentialité</Link>
          </span>
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer text-sm text-dark">
        <input type="checkbox" checked={partage} onChange={(e) => setPartage(e.target.checked)} className="mt-1 accent-primary w-4 h-4" />
        <span>J&apos;accepte que {organisation.nom} connaisse mon nom et mon email (pour me remercier ou me tenir informé).</span>
      </label>

      {status !== "authenticated" ? (
        <Link href={`/login?callbackUrl=${encodeURIComponent(`${pathname}#don`)}`}
          className="flex items-center justify-center w-full bg-secondary text-white font-bold py-3.5 rounded-xl hover:bg-secondary/90">
          Se connecter pour donner
        </Link>
      ) : !config.actif || moyensDispo.length === 0 ? (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">Les dons en ligne sont momentanément indisponibles.</p>
      ) : (
        <>
          <fieldset>
            <legend className="text-sm font-bold text-dark mb-2">Payer avec</legend>
            <div className="grid grid-cols-3 gap-2">
              {moyensDispo.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" aria-pressed={moyenChoisi === id} onClick={() => setMoyen(id)}
                  className={cn("flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-bold transition-colors",
                    moyenChoisi === id ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-dark hover:border-primary/40")}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </fieldset>
          {erreur && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erreur}</p>}
          <button type="button" onClick={donner} disabled={!valide || envoi}
            className="flex items-center justify-center gap-2 w-full bg-secondary text-white font-bold py-3.5 rounded-xl hover:bg-secondary/90 disabled:opacity-60">
            <Lock size={16} /> {envoi ? "Redirection vers le paiement…" : `Donner ${formatPrice(calcul.total)}`}
          </button>
          <p className="text-xs text-gray-600 text-center">Paiement sécurisé par {moyenChoisi === "paypal" ? "PayPal" : "FedaPay"}. Ce n&apos;est pas un reçu fiscal.</p>
        </>
      )}
    </section>
  );
}
