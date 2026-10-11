import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC, VersionFrancaiseFaitFoi } from "@/components/legal/LegalPage";

/** English version (the French version prevails). */
export default function ContenuEn() {
  return (
    <LegalPage
      titre="Legal notice"
      miseAJour="7 October 2026"
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
              <li>Company name: <AC>company name</AC> — <AC>legal form and share capital</AC></li>
              <li>Registered office: <AC>full address</AC></li>
              <li>Registration: <AC>RCS / RCCM number and city of registration</AC></li>
              <li>VAT number: <AC>if applicable</AC></li>
              <li>Contact: <LienContact /> — <AC>phone</AC></li>
              <li>Publication director: <AC>name and position</AC></li>
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
          id: "propriete",
          titre: "Intellectual property",
          contenu: (
            <p>
              The Kwa-Ba name, its logo and all graphic and written content on the site belong to the publisher, unless stated
              otherwise. Any reproduction without permission is prohibited. Listings, photos and reviews published by users remain the
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
