import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC, VersionFrancaiseFaitFoi } from "@/components/legal/LegalPage";

/** English version (the French version prevails). */
export default function ContenuEn() {
  return (
    <LegalPage
      titre="Legal notice"
      miseAJour="22 October 2026"
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
              <li>Registration: Lomé RCCM no. <AC>RCCM</AC>; tax number (NIF) <AC>NIF</AC></li>
              <li>E-commerce: registered as an e-commerce provider under no. <AC>number</AC> (decree no. 2018-062/PR)</li>
              <li>Personal data: declaration to the personal data protection authority (IPDCP) no. <AC>number</AC></li>
              <li>Contact: <LienContact />; WhatsApp <AC>number</AC>; postal address <AC>postal address</AC></li>
              <li>Publication director: Mr MENDE Fadel, manager and Chief Executive Officer (gérant et directeur général)</li>
            </ul>
          ),
        },
        {
          id: "hebergeur",
          titre: "Hosting provider",
          contenu: (
            <ul>
              <li>Name: <AC>hosting provider name</AC></li>
              <li>Address: <AC>hosting provider address</AC></li>
              <li>Phone: <AC>hosting provider phone</AC></li>
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
              <li>Home page photos: <AC>source and licence of each image</AC></li>
              <li>Poppins and Inter fonts: SIL Open Font License.</li>
              <li>Icons: Lucide, ISC licence.</li>
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
