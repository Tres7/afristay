/** « samedi 2 novembre à 14 h 30 » à partir de l'heure du billet (AAAA-MM-JJTHH:MM, heure locale de l'aéroport). */
export function dateVol(arriveeLocale: string) {
  const [jour, heure] = arriveeLocale.split("T");
  const d = new Date(`${jour}T12:00:00`);
  return `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${heure.replace(":", " h ")}`;
}
