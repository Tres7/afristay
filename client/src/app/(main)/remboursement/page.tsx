import type { Metadata } from "next";
import Link from "next/link";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC, AValider } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Annulation et remboursement" };

export default function RemboursementPage() {
  return (
    <LegalPage
      titre="Politique d'annulation et de remboursement"
      miseAJour="7 octobre 2026"
      intro={
        <>
          <p>Cette page explique comment annuler une réservation et dans quelles conditions vous êtes remboursé.</p>
          <p>
            Votre paiement est conservé par AfriStay jusqu&apos;à votre arrivée : l&apos;hôte n&apos;est payé que 24 heures après le
            début du séjour. C&apos;est ce qui nous permet de vous rembourser rapidement en cas d&apos;annulation ou de problème.
          </p>
        </>
      }
      sections={[
        {
          id: "annuler",
          titre: "Annuler une réservation",
          contenu: (
            <ul>
              <li>Depuis <Link href="/profil/reservations">Mon profil → Mes réservations</Link>, bouton « Annuler » sur le séjour concerné.</li>
              <li>L&apos;annulation en ligne est possible jusqu&apos;à la veille de la date d&apos;arrivée.</li>
              <li>Un séjour commencé ou terminé ne peut plus être annulé en ligne : contactez l&apos;hôte via la messagerie, ou le support.</li>
            </ul>
          ),
        },
        {
          id: "bareme",
          titre: "Barème de remboursement",
          contenu: (
            <>
              <table>
                <thead><tr><th>Annulation par le voyageur</th><th>Remboursement</th></tr></thead>
                <tbody>
                  <tr><td>Plus de 7 jours avant l&apos;arrivée</td><td><AValider>100 % du prix des nuits et des frais de service</AValider></td></tr>
                  <tr><td>Entre 7 jours et 48 heures avant l&apos;arrivée</td><td><AValider>50 % du prix des nuits ; frais de service remboursés</AValider></td></tr>
                  <tr><td>Moins de 48 heures avant l&apos;arrivée</td><td><AValider>aucun remboursement du prix des nuits, sauf accord de l&apos;hôte</AValider></td></tr>
                </tbody>
              </table>
              <p className="text-sm">Ce barème peut être plus favorable si l&apos;hôte en décide ainsi pour son logement ; il n&apos;est jamais moins favorable.</p>
            </>
          ),
        },
        {
          id: "hote-admin",
          titre: "Annulation par l'hôte ou par AfriStay",
          contenu: (
            <ul>
              <li>Si l&apos;hôte annule, ou si AfriStay annule une réservation (logement non conforme, fraude, problème de sécurité), vous êtes <strong>remboursé intégralement</strong>, frais de service compris.</li>
              <li>Si le logement ne correspond pas à l&apos;annonce à votre arrivée, signalez-le dans les 24 heures avec des photos : <AValider>remboursement partiel ou total selon le préjudice constaté.</AValider></li>
            </ul>
          ),
        },
        {
          id: "transferts",
          titre: "Transferts aéroport",
          contenu: (
            <ul>
              <li>Annulation par le voyageur plus de 24 heures avant l&apos;arrivée : remboursement intégral.</li>
              <li>Moins de 24 heures avant l&apos;arrivée : aucun remboursement, le chauffeur ayant réservé sa course.</li>
              <li>Si AfriStay ne peut pas fournir de chauffeur, ou si le chauffeur ne se présente pas : remboursement intégral.</li>
            </ul>
          ),
        },
        {
          id: "delais",
          titre: "Délais et moyens de remboursement",
          contenu: (
            <ul>
              <li>Le remboursement est effectué sur le moyen de paiement utilisé : le numéro Mobile Money débité, la carte bancaire ou le compte PayPal.</li>
              <li>Un paiement PayPal est remboursé en euros, au prorata du montant remboursé.</li>
              <li>Délai : <AValider>sous 7 jours ouvrés après l&apos;annulation</AValider>, auquel peut s&apos;ajouter le délai de traitement de votre opérateur ou de votre banque.</li>
              <li>Une question sur un remboursement : <LienContact sujet="Remboursement" />.</li>
            </ul>
          ),
        },
        {
          id: "force-majeure",
          titre: "Circonstances exceptionnelles",
          contenu: (
            <p>
              En cas d&apos;événement grave et imprévisible empêchant le séjour (catastrophe naturelle, restriction officielle de
              déplacement, épidémie déclarée), la réservation peut être annulée sans frais pour le voyageur comme pour l&apos;hôte, sur
              justificatif.
            </p>
          ),
        },
      ]}
    />
  );
}
