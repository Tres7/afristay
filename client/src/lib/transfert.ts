import { langue } from "@/lib/utils";

/** « samedi 2 novembre à 14 h 30 » / « Saturday 2 November at 14:30 » à partir de l'heure du billet
 * (AAAA-MM-JJTHH:MM, heure locale de l'aéroport). */
export function dateVol(arriveeLocale: string) {
  const [jour, heure] = arriveeLocale.split("T");
  const d = new Date(`${jour}T12:00:00`);
  if (langue() === "en") {
    return `${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at ${heure}`;
  }
  return `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${heure.replace(":", " h ")}`;
}
