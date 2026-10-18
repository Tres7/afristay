import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC, AValider, VersionFrancaiseFaitFoi } from "@/components/legal/LegalPage";

/** English version (the French version prevails). */
export default function ContenuEn() {
  return (
    <LegalPage
      titre="Privacy policy (GDPR)"
      miseAJour="7 October 2026"
      intro={
        <>
          <p>
            This policy explains what personal data Kwa-Ba collects, why, how long it is kept and how to exercise your rights, in
            line with the General Data Protection Regulation (GDPR) and the data protection laws that apply in the countries where
            Kwa-Ba is available.
          </p>
          <p>We only collect the data the service needs. We sell no data and use no advertising tools.</p>
          <VersionFrancaiseFaitFoi />
        </>
      }
      sections={[
        {
          id: "responsable",
          titre: "Data controller",
          contenu: (
            <ul>
              <li>Controller: <AC>company name and legal form</AC>, <AC>registered office address</AC>.</li>
              <li>Data protection contact: <LienContact sujet="Data protection" />.</li>
              <li>Data protection officer (if appointed): <AC>name or “not appointed”</AC>.</li>
            </ul>
          ),
        },
        {
          id: "donnees",
          titre: "Data collected and purposes",
          contenu: (
            <table>
              <thead><tr><th>Data</th><th>Why</th><th>Legal basis</th></tr></thead>
              <tbody>
                <tr><td>First name, last name, email, password (stored encrypted, never readable), role (traveller or host)</td><td>Create and secure your account</td><td>Performance of the contract (terms of use)</td></tr>
                <tr><td>Phone (optional)</td><td>Make it easier to get in touch about a booking</td><td>Consent (optional field)</td></tr>
                <tr><td>Google ID and profile photo (only if you use “Continue with Google”)</td><td>Simplified sign-in</td><td>Performance of the contract</td></tr>
                <tr><td>Bookings: dates, number of guests, amount, chosen payment method, message to the host</td><td>Manage your stay and pass it on to the host</td><td>Performance of the contract</td></tr>
                <tr><td>Payments: amount, status, transaction ID at FedaPay or PayPal, Mobile Money operator and number charged</td><td>Collect payment for the stay, refund you on the same payment method, accounting</td><td>Performance of the contract; legal obligation (accounting)</td></tr>
                <tr><td>Airport transfers: airport, flight time and number, passengers, luggage, destination address, phone number, message to the driver</td><td>Arrange your airport pick-up</td><td>Performance of the contract</td></tr>
                <tr><td>Partner drivers: identity, phone, vehicle, number plate, Mobile Money account</td><td>Assign rides and pay drivers</td><td>Performance of the contract</td></tr>
                <tr><td>Car hire: vehicle, option, pick-up and return places and dates, delivery address, number of people, phone number, details of your needs; if you drive: driver&apos;s name, licence number and country</td><td>Arrange the rental with the partner rental company</td><td>Performance of the contract</td></tr>
                <tr><td>Partner rental companies: company name, contact, phone, Mobile Money account</td><td>Assign rentals and pay rental companies</td><td>Performance of the contract</td></tr>
                <tr><td>Hosts: country, operator, Mobile Money number and account holder name</td><td>Pay hosts for their stays</td><td>Performance of the contract</td></tr>
                <tr><td>Hosts: acceptance of the pre-registration and signature of the host agreement (date and time, IP address, browser, version and fingerprint of the accepted text, name and signature for the agreement)</td><td>Prove the host&apos;s agreement in case of dispute</td><td>Performance of the contract; legitimate interest (proof)</td></tr>
                <tr><td>Hosts: ID document (type and copy), report of the visit of the place by a Kwa-Ba agent (checks made, comment, photos taken on site)</td><td>Check the host&apos;s identity and that the place matches the listing before it goes live, to protect travellers. Only Kwa-Ba agents can see the copy, never travellers</td><td>Legitimate interest (fraud prevention)</td></tr>
                <tr><td>Messages exchanged with hosts or travellers</td><td>Messaging and email notifications</td><td>Performance of the contract</td></tr>
                <tr><td>Reviews and ratings (published with your first name and last initial)</td><td>Inform other travellers</td><td>Legitimate interest (reliable reviews)</td></tr>
                <tr><td>Group trips (Kwa-Ba Together): trip name, destination, dates, members, proposed places and votes, itinerary, practical information, bookings you choose to share</td><td>Plan a trip with others</td><td>Performance of the contract</td></tr>
                <tr><td>Kwa-Ba Give donations: chosen NGO and project, amount, fees, payment method, consent to share your identity with the NGO</td><td>Collect the donation, pay it to the NGO, send you the confirmation and payout updates</td><td>Performance of the contract</td></tr>
                <tr><td>Conversations with the AI Concierge: your messages and the replies, suggested offers</td><td>Help you plan your stay; monitor the cost of the service</td><td>Performance of the contract (requested service)</td></tr>
                <tr><td>Favourites</td><td>Find saved places again</td><td>Performance of the contract</td></tr>
                <tr><td>Hosts: listings, photos (metadata and GPS location removed on upload), calendar</td><td>Publish and manage places</td><td>Performance of the contract</td></tr>
                <tr><td>Temporary verification codes, number of attempts</td><td>Verify your email, secure password resets, block abuse</td><td>Legitimate interest (security)</td></tr>
                <tr><td>Chosen language (French or English)</td><td>Show the site in your language</td><td>Performance of the contract</td></tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "pas-collecte",
          titre: "What we do not collect",
          contenu: (
            <ul>
              <li>No card number or Mobile Money PIN: payment details are entered directly on FedaPay&apos;s or PayPal&apos;s secure pages.</li>
              <li>No audience measurement, advertising trackers or profiling.</li>
              <li>No ID documents, date of birth or sensitive data.</li>
              <li>The adults / children split entered during a search is not saved: only the total number of guests is.</li>
            </ul>
          ),
        },
        {
          id: "destinataires",
          titre: "Recipients and processors",
          contenu: (
            <ul>
              <li>The <strong>host</strong> of the place you book receives your name, the booking details and your message.</li>
              <li>A <strong>Kwa-Ba Give partner NGO</strong> only receives your name and email if you agreed to this when donating; otherwise your donation is shown to it as anonymous. The total amount paid out each month is published, without donors&apos; names.</li>
              <li>The <strong>partner driver</strong> for a transfer receives your name, phone number, flight number, number of passengers and bags, destination address and your message.</li>
              <li>The <strong>partner rental company</strong> for a car hire receives your name, phone number, the vehicle, places and dates, number of people, your details and, if you drive, the driver&apos;s name and licence details.</li>
              <li><strong>Members of a group trip</strong> see your first name and last initial, your votes, your proposals and the bookings you share with them (place, dates, amount).</li>
              <li>Kwa-Ba <strong>administrators</strong>, for moderation and support (restricted and logged access).</li>
              <li>Website and data hosting: <AC>hosting provider name, address and country</AC>.</li>
              <li>Email delivery (codes, notifications): <strong>Brevo</strong> (Sendinblue SAS, Paris, France), with data hosted in the European Union. Receives your email address and the content of the messages sent.</li>
              <li><strong>FedaPay</strong> (Benin): Mobile Money and card payments, payouts to hosts and refunds. Receives your name, email, the amount and, for hosts, the payout number.</li>
              <li><strong>Google</strong> (United States), Gemini API: only if you use the AI Concierge. Receives the content of your messages to generate replies and keeps the conversation history for up to 55 days so it can be continued. <AValider>Used on a paid plan: under its terms, Google then does not use this data to improve its products.</AValider> Do not include sensitive data.</li>
              <li><strong>PayPal</strong> (Europe): only if you choose this payment method. Receives the amount and the booking reference.</li>
              <li>Google: only if you use Google sign-in or agree to show the map (see the <Link href="/cookies">cookie policy</Link>). Google may process data outside the European Union, under the EU–US Data Privacy Framework.</li>
              <li>Unsplash: some illustration photos are loaded from its servers, which then receive your IP address.</li>
            </ul>
          ),
        },
        {
          id: "durees",
          titre: "Retention periods",
          contenu: (
            <ul>
              <li>Verification codes: 10 minutes. Cookie choices: 6 months. Language choice: 1 year.</li>
              <li>Account: as long as it is active; <AValider>deleted or anonymised after 3 years without signing in.</AValider></li>
              <li>Bookings: <AValider>length of the relationship, then 5 years (limitation period).</AValider></li>
              <li>Payments, payouts, refunds, donations and payouts to NGOs: <AValider>10 years (accounting records).</AValider></li>
              <li>AI Concierge conversations: until you delete them (button in the conversation), <AValider>and at most 12 months after the last message.</AValider></li>
              <li>Messages: <AValider>3 years after the last message in the conversation.</AValider></li>
              <li>Reviews: as long as the place is published, or until removed by moderation.</li>
              <li>Technical security logs: <AValider>1 year.</AValider></li>
              <li>Copy of a host&apos;s ID document: deleted as soon as the agent has checked the identity (only the document type and the result of the check are kept). Visit report and photos: <AValider>as long as the listing is published, then 3 years.</AValider></li>
            </ul>
          ),
        },
        {
          id: "droits",
          titre: "Your rights",
          contenu: (
            <>
              <p>You have the right to access, rectify, erase, restrict, object to and port your data, and the right to withdraw your consent at any time.</p>
              <ul>
                <li>Change your details: <Link href="/profil/edit">My profile → My details</Link>.</li>
                <li>Close your account: from the same page, under “Close my account”.</li>
                <li>Get a copy of your data or have it permanently erased: write to <LienContact sujet="My personal data" />. We reply within one month at most.</li>
              </ul>
              <p>
                If you believe your rights are not being respected, you can contact the competent data protection authority: the CNIL in
                France (<a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr</a>), or the
                authority in your country (for example ARTCI in Côte d&apos;Ivoire, CDP in Senegal, IPDCP in Togo).
              </p>
            </>
          ),
        },
        {
          id: "securite",
          titre: "Security",
          contenu: (
            <ul>
              <li>Passwords are hashed, never stored in plain text.</li>
              <li>Your sign-in session is kept in a cookie scripts cannot read; the access token is renewed every hour.</li>
              <li>Limits on attempts at verification codes and on sending messages.</li>
              <li>Photos uploaded by hosts are stripped of their metadata (including GPS location).</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
