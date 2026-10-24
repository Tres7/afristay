import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { VersionFrancaiseFaitFoi } from "@/components/legal/LegalPage";
import { AccommodationTable, MobilityTable } from "../cgv/en";

/** English version (the French version prevails). Mirrors annex 1 and articles 10 to 12 of the terms of sale. */
export default function ContenuEn() {
  return (
    <LegalPage
      titre="Cancellation and refund policy"
      miseAJour="22 October 2026"
      intro={
        <>
          <p>
            This page explains how to cancel a booking and when you get a refund. It mirrors annex 1 of the{" "}
            <Link href="/cgv">terms of sale</Link>, which prevail.
          </p>
          <p>
            Kwa-Ba holds your payment: the host is only paid 24 hours after your arrival, the vehicle owner after the rental starts.
            That is what lets us refund you quickly if you cancel or something goes wrong.
          </p>
          <VersionFrancaiseFaitFoi />
        </>
      }
      sections={[
        {
          id: "annuler",
          titre: "Cancelling a booking",
          contenu: (
            <ul>
              <li>From <Link href="/profil/reservations">My profile → My bookings</Link>, “Cancel” button on the booking concerned.</li>
              <li>The time of cancellation is the one recorded by Kwa-Ba, in Lomé time (GMT).</li>
              <li>The refund amount is shown before you confirm the cancellation.</li>
            </ul>
          ),
        },
        {
          id: "reflexion",
          titre: "48-hour cooling-off period",
          contenu: (
            <p>
              Any accommodation or mobility booking cancelled within <strong>48 hours</strong> of its confirmation, and at least{" "}
              <strong>7 days</strong> before arrival or vehicle pick-up, is fully refunded, service fee included, whatever the listing’s policy.
            </p>
          ),
        },
        {
          id: "logement",
          titre: "Accommodation: the policy chosen by the host",
          contenu: (
            <>
              <p>Each host chooses one of the three policies below. It is shown on the listing and in the summary before payment.</p>
              <AccommodationTable />
              <ul>
                <li><strong>Stays of 28 nights or more:</strong> the first month is non-refundable if cancelled less than 30 days before arrival; the following months are refunded if you give at least 30 days’ notice.</li>
                <li><strong>No-show without cancellation:</strong> no refund.</li>
                <li><strong>Cleaning fee:</strong> refunded if you have not arrived.</li>
                <li><strong>Hotels:</strong> the hotel’s own policy applies if it is more favourable to you.</li>
              </ul>
            </>
          ),
        },
        {
          id: "mobilite",
          titre: "Transfers, cars and drivers",
          contenu: (
            <>
              <MobilityTable />
              <p>In the event of late cancellation, the driver’s share is paid to them. If your flight is delayed, let the driver know; waiting beyond one hour may be charged as overtime (1,000 F CFA per hour).</p>
              <p>The deposit for a car without driver, paid online, is always refunded in full if you cancel.</p>
            </>
          ),
        },
        {
          id: "prestataire",
          titre: "Cancellation by the host, the owner or Kwa-Ba",
          contenu: (
            <ul>
              <li>If the provider cancels, or if Kwa-Ba cancels a booking (non-compliant listing, fraud, safety issue), you are <strong>fully refunded</strong>, service fee included, and Kwa-Ba helps you find an equivalent solution.</li>
              <li>If the accommodation or vehicle does not match the listing, the <Link href="/cgv#garantie">Kwa-Ba Guarantee</Link> applies: report it within 24 hours of arrival (before departure for a vehicle), with photos.</li>
            </ul>
          ),
        },
        {
          id: "exceptionnelles",
          titre: "Exceptional circumstances",
          contenu: (
            <>
              <p>
                You are fully refunded, service fee included, if the service becomes impossible or prohibited for one of the following reasons,
                occurring after booking and substantiated: natural disaster; epidemic declared with travel restrictions; border closure; official
                travel ban; curfew or serious unrest in the area; death or serious hospitalisation of yourself or a close relative. You may choose
                a credit instead.
              </p>
              <p>Not covered: ordinary flight delays or cancellations, visa difficulties known at booking, illnesses without hospitalisation, and events known at the booking date.</p>
            </>
          ),
        },
        {
          id: "delais",
          titre: "Refund times and methods",
          contenu: (
            <ul>
              <li>Refunds are made to the payment method used (Mobile Money, bank card or PayPal) within <strong>7 working days</strong>, plus any processing time of your operator or bank.</li>
              <li>If this is not possible, they are made to a Mobile Money account in your name, with your agreement.</li>
              <li>A PayPal payment is refunded in euros, in proportion to the amount refunded.</li>
              <li>Any question about a refund: <LienContact sujet="Refund" />.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
