import type { Metadata } from "next";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      titre="Mentions légales"
      miseAJour="7 octobre 2026"
      intro={<p>Informations relatives à l&apos;éditeur du site Kwa-Ba, à son hébergeur et aux contenus publiés.</p>}
      sections={[
        {
          id: "editeur",
          titre: "Éditeur du site",
          contenu: (
            <ul>
              <li>Dénomination : <AC>raison sociale</AC> — <AC>forme juridique et capital social</AC></li>
              <li>Siège social : <AC>adresse complète</AC></li>
              <li>Immatriculation : <AC>numéro RCS / RCCM et ville d&apos;immatriculation</AC></li>
              <li>Numéro de TVA intracommunautaire : <AC>si applicable</AC></li>
              <li>Contact : <LienContact /> — <AC>téléphone</AC></li>
              <li>Directeur ou directrice de la publication : <AC>nom et fonction</AC></li>
            </ul>
          ),
        },
        {
          id: "hebergeur",
          titre: "Hébergeur",
          contenu: (
            <ul>
              <li>Nom : <AC>nom de l&apos;hébergeur</AC></li>
              <li>Adresse : <AC>adresse de l&apos;hébergeur</AC></li>
              <li>Téléphone : <AC>téléphone de l&apos;hébergeur</AC></li>
            </ul>
          ),
        },
        {
          id: "propriete",
          titre: "Propriété intellectuelle",
          contenu: (
            <p>
              Le nom Kwa-Ba, son logo et l&apos;ensemble des éléments graphiques et textuels du site sont la propriété de l&apos;éditeur,
              sauf mention contraire. Toute reproduction sans autorisation est interdite. Les annonces, photos et avis publiés par les
              utilisateurs restent la propriété de leurs auteurs.
            </p>
          ),
        },
        {
          id: "credits",
          titre: "Crédits",
          contenu: (
            <ul>
              <li>Photos d&apos;illustration des logements de démonstration et des pages de connexion : <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>, sous la <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">licence Unsplash</a>.</li>
              <li>Photos de la page d&apos;accueil : <AC>source et licence de chaque image</AC></li>
              <li>Polices Poppins et Inter : licence SIL Open Font License.</li>
              <li>Icônes : Lucide, licence ISC.</li>
              <li>Photos des annonces : publiées par les hôtes, qui garantissent en détenir les droits.</li>
            </ul>
          ),
        },
        {
          id: "signalement",
          titre: "Signaler un contenu",
          contenu: (
            <p>
              Pour signaler un contenu illicite (annonce frauduleuse, photo utilisée sans droit, propos haineux), écrivez à{" "}
              <LienContact sujet="Signalement d'un contenu" /> en précisant l&apos;adresse de la page concernée. Les contenus manifestement illicites sont
              retirés dans les meilleurs délais.
            </p>
          ),
        },
      ]}
    />
  );
}
