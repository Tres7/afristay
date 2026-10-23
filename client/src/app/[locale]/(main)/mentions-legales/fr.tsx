import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import MentionSociete from "@/components/legal/MentionSociete";
import LegalPage, { AC } from "@/components/legal/LegalPage";

/** Version française. */
export default function ContenuFr() {
  return (
    <LegalPage
      titre="Mentions légales"
      miseAJour="23 octobre 2026"
      intro={<p>Informations relatives à l&apos;éditeur du site Kwa-Ba, à son hébergeur et aux contenus publiés.</p>}
      sections={[
        {
          id: "editeur",
          titre: "Éditeur du site",
          contenu: (
            <ul>
              <li>Dénomination : <strong>KWA-BA SARL</strong>, société à responsabilité limitée au capital de 100 000 F CFA</li>
              <li>Siège social : quartier Totsi Gblenkomé, rue 243, Lomé (Togo)</li>
              <li>Immatriculation : RCCM de Lomé n° <MentionSociete cle="rccm" libelle="RCCM" /> ; NIF <MentionSociete cle="nif" libelle="NIF" /></li>
              <li>Commerce électronique : enregistrée comme prestataire de commerce électronique sous le n° <MentionSociete cle="commerce_electronique" libelle="numéro" /> (décret n° 2018-062/PR)</li>
              <li>Données personnelles : déclaration auprès de l&apos;Instance de protection des données à caractère personnel (IPDCP) n° <MentionSociete cle="ipdcp" libelle="numéro" /></li>
              <li>Contact : <LienContact /> ; WhatsApp <MentionSociete cle="whatsapp" libelle="numéro" /> ; adresse postale : quartier Totsi Gblenkomé, rue 243, Lomé, Togo</li>
              <li>Cogérants : M. MENDE Fadel et M. KPOGLO Dzidoula Godwin Trésor — Directeur de la publication : M. MENDE Fadel.</li>
            </ul>
          ),
        },
        {
          id: "hebergeur",
          titre: "Hébergeur",
          contenu: (
            <ul>
              <li>Nom : <strong>IONOS SE</strong> (serveur privé virtuel du site et de ses données)</li>
              <li>Adresse : Elgendorfer Straße 57, 56410 Montabaur, Allemagne</li>
              <li>Téléphone : +49 721 170 5522</li>
              <li>Le nom de domaine kwa-ba.com et la messagerie info@kwa-ba.com sont gérés chez Hostinger.</li>
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
              <li>Photos de la page d&apos;accueil, sous la <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">licence Unsplash</a> (usage libre, y compris commercial) :
                <ul>
                  <li>Euphorbe au coucher du soleil : <a href="https://unsplash.com/photos/tall-cactus-trees-in-savanna-at-sunset-ZgzN3Zz6qNk" target="_blank" rel="noopener noreferrer">Wietse Jongsma</a></li>
                  <li>Zèbres dans la savane (réserve de Mala Mala, Afrique du Sud) : <a href="https://unsplash.com/photos/zebras-walking-across-a-grassy-field-at-sunset-gloMjPyIzWo" target="_blank" rel="noopener noreferrer">Edmund Loh</a></li>
                  <li>Éléphants au coucher du soleil : <a href="https://unsplash.com/photos/elephants-silhouetted-against-a-vibrant-african-savanna-sunset-DHx9_Sa8jpU" target="_blank" rel="noopener noreferrer">Edyta Michalska</a></li>
                  <li>Véhicules de safari dans la savane : <a href="https://unsplash.com/photos/a-safari-vehicle-driving-through-a-dry-grass-field-rlr0oaz2nZQ" target="_blank" rel="noopener noreferrer">Denice Alex</a></li>
                  <li>4x4 sous un acacia : <a href="https://unsplash.com/photos/grey-vehicle-parked-beside-tree-during-daytime-Wa1zZ70As9o" target="_blank" rel="noopener noreferrer">David Clode</a></li>
                </ul>
              </li>
              <li>Polices Montserrat et Inter : licence SIL Open Font License.</li>
              <li>Icônes : Lucide (licence ISC) et Phosphor (licence MIT).</li>
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
