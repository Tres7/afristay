import { CONTACT_EMAIL } from "@/lib/contact";

/** Lien « mailto » vers l'adresse de contact, avec un sujet prérempli facultatif. */
export default function LienContact({ sujet }: { sujet?: string }) {
  const href = `mailto:${CONTACT_EMAIL}${sujet ? `?subject=${encodeURIComponent(sujet)}` : ""}`;
  return <a href={href}>{CONTACT_EMAIL}</a>;
}
