import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import MentionSociete from "@/components/legal/MentionSociete";
import LegalPage, { AC, VersionFrancaiseFaitFoi } from "@/components/legal/LegalPage";

/** English version (the French version prevails). */
export default function ContenuEn() {
  return (
    <LegalPage
      titre="Legal notice"
      miseAJour="23 October 2026"
      intro={
        <>
          <p>Information about the publisher of the Kwa-Ba website, its host and the content published on it.</p>
          <VersionFrancaiseFaitFoi />
        </>
      }
      sections={[
        {
          id: "editeur",
          titre: "Website publisher",
          contenu: (
            <ul>
              <li>Company name: <strong>KWA-BA SARL</strong>, a limited liability company with a share capital of 100,000 F CFA</li>
              <li>Registered office: Totsi Gblenkomé district, street 243, Lomé (Togo)</li>
              <li>Registration: Lomé RCCM no. <MentionSociete cle="rccm" libelle="RCCM" />; tax number (NIF) <MentionSociete cle="nif" libelle="NIF" /></li>
              <li>E-commerce: registered as an e-commerce provider under no. <MentionSociete cle="commerce_electronique" libelle="number" /> (decree no. 2018-062/PR)</li>
              <li>Personal data: declaration to the personal data protection authority (IPDCP) no. <MentionSociete cle="ipdcp" libelle="number" /></li>
              <li>Contact: <LienContact />; WhatsApp <MentionSociete cle="whatsapp" libelle="number" />; postal address: Totsi Gblenkomé district, street 243, Lomé, Togo</li>
              <li>Co-managers (cogérants): Mr MENDE Fadel and Mr KPOGLO Dzidoula Godwin Trésor — Publication director: Mr MENDE Fadel.</li>
            </ul>
          ),
        },
        {
          id: "hebergeur",
          titre: "Hosting provider",
          contenu: (
            <ul>
              <li>Name: <strong>IONOS SE</strong> (virtual private server of the website and its data)</li>
              <li>Address: Elgendorfer Straße 57, 56410 Montabaur, Germany</li>
              <li>Phone: +49 721 170 5522</li>
              <li>The kwa-ba.com domain name and the info@kwa-ba.com mailbox are managed by Hostinger.</li>
            </ul>
          ),
        },
        {
          id: "paiement",
          titre: "Payment provider",
          contenu: <p>FedaPay, a payment institution licensed by the BCEAO; if needed, another licensed provider (<Link href="/cgv#paiement">terms of sale, art. 7</Link>).</p>,
        },
        {
          id: "propriete",
          titre: "Intellectual property",
          contenu: (
            <p>
              The Kwa-Ba name, logo, graphic charter, texts and code of the Platform belong to KWA-BA SARL, unless stated otherwise{" "}
              <AC>trademark registered with OAPI under no. …, if filed</AC>. Any reproduction without permission is prohibited. Listings, photos and reviews published by users remain the
              property of their authors.
            </p>
          ),
        },
        {
          id: "credits",
          titre: "Credits",
          contenu: (
            <ul>
              <li>Illustration photos for demo listings and sign-in pages: <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>, under the <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash licence</a>.</li>
              <li>Home page photos, under the <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash licence</a> (free use, including commercial):
                <ul>
                  <li>Euphorbia tree at sunset: <a href="https://unsplash.com/photos/tall-cactus-trees-in-savanna-at-sunset-ZgzN3Zz6qNk" target="_blank" rel="noopener noreferrer">Wietse Jongsma</a></li>
                  <li>Zebras in the savanna (Mala Mala reserve, South Africa): <a href="https://unsplash.com/photos/zebras-walking-across-a-grassy-field-at-sunset-gloMjPyIzWo" target="_blank" rel="noopener noreferrer">Edmund Loh</a></li>
                  <li>Elephants at sunset: <a href="https://unsplash.com/photos/elephants-silhouetted-against-a-vibrant-african-savanna-sunset-DHx9_Sa8jpU" target="_blank" rel="noopener noreferrer">Edyta Michalska</a></li>
                  <li>Safari vehicles in the savanna: <a href="https://unsplash.com/photos/a-safari-vehicle-driving-through-a-dry-grass-field-rlr0oaz2nZQ" target="_blank" rel="noopener noreferrer">Denice Alex</a></li>
                  <li>4x4 under an acacia tree: <a href="https://unsplash.com/photos/grey-vehicle-parked-beside-tree-during-daytime-Wa1zZ70As9o" target="_blank" rel="noopener noreferrer">David Clode</a></li>
                </ul>
              </li>
              <li>Montserrat and Inter fonts: SIL Open Font License.</li>
              <li>Icons: Lucide (ISC licence) and Phosphor (MIT licence).</li>
              <li>Listing photos: published by hosts, who guarantee they hold the rights.</li>
            </ul>
          ),
        },
        {
          id: "signalement",
          titre: "Report content",
          contenu: (
            <p>
              To report unlawful content (fraudulent listing, photo used without permission, hate speech), write to{" "}
              <LienContact sujet="Content report" /> with the address of the page concerned. Clearly unlawful content is removed as
              quickly as possible.
            </p>
          ),
        },
      ]}
    />
  );
}
