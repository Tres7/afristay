import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC } from "@/components/legal/LegalPage";

/** Version française. */
export default function ContenuFr() {
  return (
    <LegalPage
      titre="Mentions légales"
      miseAJour="22 octobre 2026"
      intro={<p>Informations relatives à l&apos;éditeur du site Kwa-Ba, à son hébergeur et aux contenus publiés.</p>}
      sections={[
        {
          id: "editeur",
          titre: "Éditeur du site",
          contenu: (
            <ul>
              <li>Dénomination : <strong>KWA-BA SARL</strong>, société à responsabilité limitée au capital de 100 000 F CFA</li>
              <li>Siège social : quartier Totsi Gblenkomé, rue 243, Lomé (Togo)</li>
              <li>Immatriculation : RCCM de Lomé n° <AC>RCCM</AC> ; NIF <AC>NIF</AC></li>
              <li>Commerce électronique : enregistrée comme prestataire de commerce électronique sous le n° <AC>numéro</AC> (décret n° 2018-062/PR)</li>
              <li>Données personnelles : déclaration auprès de l&apos;Instance de protection des données à caractère personnel (IPDCP) n° <AC>numéro</AC></li>
              <li>Contact : <LienContact /> ; WhatsApp <AC>numéro</AC> ; adresse postale <AC>adresse postale</AC></li>
              <li>Directeur de la publication : M. MENDE Fadel, gérant et directeur général</li>
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
          id: "paiement",
          titre: "Prestataire de paiement",
          contenu: <p>FedaPay, établissement de paiement agréé par la BCEAO ; en cas de besoin, un autre prestataire agréé (<Link href="/cgv#paiement">CGV, art. 7</Link>).</p>,
        },
        {
          id: "propriete",
          titre: "Propriété intellectuelle",
          contenu: (
            <p>
              Le nom Kwa-Ba, le logo, la charte graphique, les textes et le code de la Plateforme appartiennent à KWA-BA SARL, sauf
              mention contraire <AC>marque déposée à l&apos;OAPI sous le n° …, si le dépôt est décidé</AC>. Toute reproduction sans autorisation est interdite. Les annonces, photos et avis publiés par les
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
