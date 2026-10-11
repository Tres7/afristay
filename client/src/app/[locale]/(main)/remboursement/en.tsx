import { Link } from "@/i18n/navigation";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AValider, VersionFrancaiseFaitFoi } from "@/components/legal/LegalPage";

/** English version (the French version prevails). */
export default function ContenuEn() {
  return (
    <LegalPage
      titre="Cancellation and refund policy"
      miseAJour="7 October 2026"
      intro={
        <>
          <p>This page explains how to cancel a booking and when you get a refund.</p>
          <p>
            Kwa-Ba holds your payment until you arrive: the host is only paid 24 hours after the stay begins. That is what lets us
            refund you quickly if you cancel or something goes wrong.
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
              <li>From <Link href="/profil/reservations">My profile → My bookings</Link>, use the “Cancel” button on the stay.</li>
              <li>You can cancel online until the day before check-in.</li>
              <li>A stay that has started or ended can no longer be cancelled online: contact the host through messaging, or support.</li>
            </ul>
          ),
        },
        {
          id: "bareme",
          titre: "Refund schedule",
          contenu: (
            <>
              <table>
                <thead><tr><th>Cancellation by the traveller</th><th>Refund</th></tr></thead>
                <tbody>
                  <tr><td>More than 7 days before check-in</td><td><AValider>100% of the nightly price and service fees</AValider></td></tr>
                  <tr><td>Between 7 days and 48 hours before check-in</td><td><AValider>50% of the nightly price; service fees refunded</AValider></td></tr>
                  <tr><td>Less than 48 hours before check-in</td><td><AValider>no refund of the nightly price, unless the host agrees</AValider></td></tr>
                </tbody>
              </table>
              <p className="text-sm">The host may make this schedule more generous for their place; it is never less favourable.</p>
            </>
          ),
        },
        {
          id: "hote-admin",
          titre: "Cancellation by the host or by Kwa-Ba",
          contenu: (
            <ul>
              <li>If the host cancels, or if Kwa-Ba cancels a booking (place not as described, fraud, safety issue), you get a <strong>full refund</strong>, service fees included.</li>
              <li>If the place does not match the listing when you arrive, report it within 24 hours with photos: <AValider>partial or full refund depending on the issue found.</AValider></li>
            </ul>
          ),
        },
        {
          id: "transferts",
          titre: "Airport transfers",
          contenu: (
            <ul>
              <li>Cancellation by the traveller more than 24 hours before arrival: full refund.</li>
              <li>Less than 24 hours before arrival: no refund, as the driver has reserved the ride.</li>
              <li>If Kwa-Ba cannot provide a driver, or the driver does not show up: full refund.</li>
            </ul>
          ),
        },
        {
          id: "delais",
          titre: "Refund timing and methods",
          contenu: (
            <ul>
              <li>Refunds go back to the payment method used: the Mobile Money number charged, the bank card or the PayPal account.</li>
              <li>A PayPal payment is refunded in euros, in proportion to the amount refunded.</li>
              <li>Timing: <AValider>within 7 working days of cancellation</AValider>, plus any processing time at your operator or bank.</li>
              <li>A question about a refund: <LienContact sujet="Refund" />.</li>
            </ul>
          ),
        },
        {
          id: "force-majeure",
          titre: "Exceptional circumstances",
          contenu: (
            <p>
              If a serious and unforeseeable event prevents the stay (natural disaster, official travel restriction, declared
              epidemic), the booking can be cancelled free of charge for both the traveller and the host, with supporting evidence.
            </p>
          ),
        },
      ]}
    />
  );
}
