import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC, VersionFrancaiseFaitFoi } from "@/components/legal/LegalPage";

/** English version (the French version prevails). */
export default function ContenuEn() {
  return (
    <LegalPage
      titre="Terms of use"
      miseAJour="7 October 2026"
      intro={
        <>
          <p>
            These terms govern how travellers and hosts use the Kwa-Ba platform. By creating an account, you accept them. They are
            supplemented by the <Link href="/confidentialite">privacy policy</Link>, the <Link href="/cookies">cookie policy</Link> and
            the <Link href="/remboursement">cancellation and refund policy</Link>.
          </p>
          <VersionFrancaiseFaitFoi />
        </>
      }
      sections={[
        {
          id: "service",
          titre: "The Kwa-Ba service",
          contenu: (
            <p>
              Kwa-Ba connects travellers with hosts offering places to stay in Africa. Kwa-Ba acts as an intermediary: the rental
              contract is between the traveller and the host, who remains responsible for the accommodation and for welcoming guests.
            </p>
          ),
        },
        {
          id: "compte",
          titre: "User account",
          contenu: (
            <ul>
              <li>You must be 18 or over and provide accurate information.</li>
              <li>Your email address is verified with a code before you first log in.</li>
              <li>You are responsible for keeping your password confidential. Report any suspicious use of your account.</li>
              <li>You can close your account at any time from your profile.</li>
            </ul>
          ),
        },
        {
          id: "voyageurs",
          titre: "Travellers' commitments",
          contenu: (
            <ul>
              <li>Respect the place, the number of guests booked and the house rules provided by the host.</li>
              <li>Only use messaging for matters related to the stay.</li>
              <li>Only publish honest reviews about a stay that actually took place.</li>
            </ul>
          ),
        },
        {
          id: "hotes",
          titre: "Hosts' commitments",
          contenu: (
            <ul>
              <li>Publish accurate listings: description, amenities, price, capacity and photos that truly reflect the place.</li>
              <li>
                <strong>Only publish photos you hold the rights to</strong> (taken by you or with the author&apos;s permission) and that
                show no identifiable person without their consent.
              </li>
              <li>Keep your calendar up to date and honour confirmed bookings.</li>
              <li>Provide a Mobile Money account in your name (or your company&apos;s) to receive payouts.</li>
              <li>Comply with applicable local regulations (declarations, tourist taxes, safety of the accommodation).</li>
              <li>Reply to travellers within a reasonable time.</li>
            </ul>
          ),
        },
        {
          id: "reservations",
          titre: "Bookings and payment",
          contenu: (
            <>
              <p>
                The price paid by the traveller includes the nightly price set by the host and an 8% Kwa-Ba service fee. Dates are
                held for 30 minutes while you pay; the booking is confirmed as soon as payment is received. Without payment within
                that time, the dates are released.
              </p>
              <p>
                Payment is made on our providers&apos; secure pages: <strong>FedaPay</strong> (Mobile Money, Visa or Mastercard, in CFA
                francs) or <strong>PayPal</strong> (in euros, at the fixed rate of €1 = 655.957 FCFA). Kwa-Ba stores no card data or
                Mobile Money PIN.
              </p>
              <p>
                Kwa-Ba collects the payment on behalf of the host and holds it until the stay. <strong>The host receives the nightly
                price minus a 5% commission</strong> on their Mobile Money account 24 hours after the traveller arrives. This delay
                allows the traveller to be refunded if the place does not match the listing. Cancellation terms are described in the{" "}
                <Link href="/remboursement">cancellation and refund policy</Link>.
              </p>
            </>
          ),
        },
        {
          id: "transferts",
          titre: "Airport transfers",
          contenu: (
            <ul>
              <li>
                Transfers are provided by <strong>independent partner drivers</strong> selected by Kwa-Ba, which remains your point of
                contact and collects the fare.
              </li>
              <li>The price is fixed and paid when booking; a 25% surcharge applies to arrivals between 10 pm and 6 am. No extra charge can be requested on site.</li>
              <li>Book at least 6 hours before landing. The driver waits up to 60 minutes after the stated arrival time; if your flight is delayed, let them know.</li>
              <li>Free cancellation up to 24 hours before arrival; after that, the fare remains due to the driver. If Kwa-Ba cannot provide a driver, the transfer is refunded in full.</li>
            </ul>
          ),
        },
        {
          id: "concierge",
          titre: "AI Concierge",
          contenu: (
            <ul>
              <li>The Concierge is an assistant based on artificial intelligence (Google&apos;s Gemini). You are talking to a machine, not a person.</li>
              <li>Its answers may contain mistakes. Prices and availability of places and transfers come from Kwa-Ba and are binding at the time of booking; other information (restaurants, opening hours, procedures) should be checked.</li>
              <li>The Concierge never books or pays anything for you. Do not share bank details, your Mobile Money PIN or sensitive data with it.</li>
              <li>Its use is limited to a number of messages per hour and per day.</li>
            </ul>
          ),
        },
        {
          id: "avis",
          titre: "Reviews and moderation",
          contenu: (
            <ul>
              <li>Only a traveller who stayed can review a place, once, within 60 days of check-out.</li>
              <li>The host can reply publicly once to each review.</li>
              <li>
                Kwa-Ba may remove a review or message containing insults, discriminatory remarks, personal data or content unrelated
                to the stay. A review is never removed just because it is negative.
              </li>
            </ul>
          ),
        },
        {
          id: "suspension",
          titre: "Account suspension and closure",
          contenu: (
            <p>
              In the event of a serious breach of these terms (fraud, misleading listing, abusive behaviour), Kwa-Ba may hide a
              listing, cancel a booking or deactivate an account. The decision is explained and you can challenge it by writing to{" "}
              <LienContact sujet="Challenge to a decision" />.
            </p>
          ),
        },
        {
          id: "responsabilite",
          titre: "Liability",
          contenu: (
            <p>
              Kwa-Ba does its best to keep the service available and secure, but cannot guarantee it will never be interrupted.
              Kwa-Ba is not responsible for how the stay is carried out, which is the host&apos;s responsibility, but undertakes to
              handle reports and moderate content reported to it.
            </p>
          ),
        },
        {
          id: "propriete",
          titre: "Intellectual property",
          contenu: (
            <p>
              The Kwa-Ba brand, logo and website are protected. Content published by users (text, photos) remains theirs; by
              publishing it, they grant Kwa-Ba the right to display it on the platform for as long as it is published.
            </p>
          ),
        },
        {
          id: "droit",
          titre: "Changes to these terms and governing law",
          contenu: (
            <p>
              You will be notified of any significant change to these terms before it takes effect. These terms are governed by the
              law of <AC>country whose law applies</AC>. In the event of a dispute, an amicable solution will be sought first;
              failing that, the competent courts will be those of <AC>city / jurisdiction</AC>, subject to the protective rules that
              apply to consumers.
            </p>
          ),
        },
      ]}
    />
  );
}
