"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useConsentement } from "@/providers/ConsentProvider";

interface MapEmbedProps {
  lieu: string;
  ville: string;
}

/**
 * Carte Google Maps chargée uniquement avec l'accord du visiteur :
 * sans consentement, aucune requête n'est envoyée à Google (ni adresse IP, ni cookie).
 */
export default function MapEmbed({ lieu, ville }: MapEmbedProps) {
  const { consentement, definir } = useConsentement();
  // « Afficher une fois » : ne modifie pas le choix global
  const [unique, setUnique] = useState(false);
  const autorise = consentement?.contenusTiers || unique;
  const requete = encodeURIComponent(`${lieu} ${ville}`.trim());

  if (autorise) {
    return (
      <iframe
        title={`Carte de la zone du logement : ${lieu ? `${lieu}, ` : ""}${ville}`}
        src={`https://maps.google.com/maps?q=${requete}&z=13&output=embed`}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-3 p-5 bg-[repeating-linear-gradient(45deg,#f8f5f0,#f8f5f0_12px,#f3efe8_12px,#f3efe8_24px)]">
      <MapPin size={28} className="text-primary" aria-hidden />
      <p className="text-sm text-dark max-w-sm">
        La carte est fournie par <strong>Google Maps</strong>. En l&apos;affichant, Google reçoit votre adresse IP et peut déposer des cookies.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setUnique(true)} className="px-4 py-2 rounded-xl bg-dark text-white text-sm font-bold">
          Afficher la carte
        </button>
        <button type="button" onClick={() => definir(true)} className="px-4 py-2 rounded-xl border border-dark text-dark text-sm font-semibold">
          Toujours afficher les cartes
        </button>
      </div>
    </div>
  );
}
