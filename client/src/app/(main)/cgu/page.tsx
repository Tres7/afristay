import type { Metadata } from "next";
import Link from "next/link";
import LienContact from "@/components/legal/LienContact";
import LegalPage, { AC } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Conditions générales d'utilisation" };

export default function CguPage() {
  return (
    <LegalPage
      titre="Conditions générales d'utilisation"
      miseAJour="7 octobre 2026"
      intro={
        <p>
          Les présentes conditions encadrent l&apos;utilisation de la plateforme AfriStay par les voyageurs et les hôtes. En créant
          un compte, vous les acceptez. Elles sont complétées par la <Link href="/confidentialite">politique de confidentialité</Link>,
          la <Link href="/cookies">politique cookies</Link> et la <Link href="/remboursement">politique d&apos;annulation et de remboursement</Link>.
        </p>
      }
      sections={[
        {
          id: "service",
          titre: "Le service AfriStay",
          contenu: (
            <p>
              AfriStay met en relation des voyageurs et des hôtes proposant des hébergements en Afrique. AfriStay agit comme
              intermédiaire : le contrat de location est conclu entre le voyageur et l&apos;hôte, qui reste responsable de son
              logement et de son accueil.
            </p>
          ),
        },
        {
          id: "compte",
          titre: "Compte utilisateur",
          contenu: (
            <ul>
              <li>Vous devez avoir 18 ans ou plus et fournir des informations exactes.</li>
              <li>Votre adresse email est vérifiée par un code avant la première connexion.</li>
              <li>Vous êtes responsable de la confidentialité de votre mot de passe. Signalez toute utilisation suspecte de votre compte.</li>
              <li>Vous pouvez fermer votre compte à tout moment depuis votre profil.</li>
            </ul>
          ),
        },
        {
          id: "voyageurs",
          titre: "Engagements des voyageurs",
          contenu: (
            <ul>
              <li>Respecter le logement, le nombre de voyageurs réservé et le règlement communiqué par l&apos;hôte.</li>
              <li>N&apos;utiliser la messagerie que pour des échanges liés au séjour.</li>
              <li>Ne publier que des avis sincères, portant sur un séjour réellement effectué.</li>
            </ul>
          ),
        },
        {
          id: "hotes",
          titre: "Engagements des hôtes",
          contenu: (
            <ul>
              <li>Publier des annonces exactes : description, équipements, prix, capacité et photos fidèles au logement.</li>
              <li>
                <strong>Ne publier que des photos dont vous détenez les droits</strong> (prises par vous ou avec l&apos;autorisation de leur
                auteur) et qui ne montrent aucune personne identifiable sans son accord.
              </li>
              <li>Tenir le calendrier à jour et honorer les réservations confirmées.</li>
              <li>Indiquer un compte Mobile Money à son nom (ou à celui de son entreprise) pour recevoir ses versements.</li>
              <li>Respecter la réglementation locale applicable (déclarations, taxes de séjour, sécurité du logement).</li>
              <li>Répondre aux voyageurs dans un délai raisonnable.</li>
            </ul>
          ),
        },
        {
          id: "reservations",
          titre: "Réservations et paiement",
          contenu: (
            <>
              <p>
                Le prix payé par le voyageur comprend le prix des nuits fixé par l&apos;hôte et des frais de service AfriStay de 8 %.
                Les dates sont bloquées pendant 30 minutes le temps du paiement ; la réservation est confirmée dès que le paiement est
                reçu. Sans paiement dans ce délai, les dates sont libérées.
              </p>
              <p>
                Le paiement s&apos;effectue sur la page sécurisée de nos prestataires : <strong>FedaPay</strong> (Mobile Money, carte Visa ou
                Mastercard, en francs CFA) ou <strong>PayPal</strong> (en euros, à la parité fixe 1 € = 655,957 FCFA). AfriStay ne
                conserve aucune donnée de carte ni code Mobile Money.
              </p>
              <p>
                AfriStay encaisse le paiement pour le compte de l&apos;hôte et le conserve jusqu&apos;au séjour. <strong>L&apos;hôte reçoit le
                prix des nuits, diminué d&apos;une commission de 5 %</strong>, sur son compte Mobile Money 24 heures après l&apos;arrivée du
                voyageur. Ce délai permet de rembourser le voyageur si le logement ne correspond pas à l&apos;annonce. Les conditions
                d&apos;annulation sont décrites dans la <Link href="/remboursement">politique d&apos;annulation et de remboursement</Link>.
              </p>
            </>
          ),
        },
        {
          id: "transferts",
          titre: "Transferts aéroport",
          contenu: (
            <ul>
              <li>
                Les transferts sont assurés par des <strong>chauffeurs partenaires indépendants</strong> sélectionnés par AfriStay, qui
                reste votre interlocuteur et encaisse le prix de la course.
              </li>
              <li>Le prix est fixe et payé à la réservation ; une majoration de 25 % s&apos;applique aux arrivées entre 22 h et 6 h. Aucun supplément ne peut être demandé sur place.</li>
              <li>Réservation au plus tard 6 heures avant l&apos;atterrissage. Le chauffeur attend jusqu&apos;à 60 minutes après l&apos;heure d&apos;arrivée indiquée ; en cas de retard de vol, prévenez-le.</li>
              <li>Annulation gratuite jusqu&apos;à 24 heures avant l&apos;arrivée ; ensuite, le prix reste dû au chauffeur. Si AfriStay ne peut pas fournir de chauffeur, le transfert est intégralement remboursé.</li>
            </ul>
          ),
        },
        {
          id: "concierge",
          titre: "Concierge IA",
          contenu: (
            <ul>
              <li>Le Concierge est un assistant fondé sur l&apos;intelligence artificielle (Gemini, de Google). Vous dialoguez avec une machine, pas avec une personne.</li>
              <li>Ses réponses peuvent contenir des erreurs. Les prix et disponibilités des logements et des transferts proviennent d&apos;AfriStay et font foi au moment de la réservation ; les autres informations (restaurants, horaires, démarches) sont à vérifier.</li>
              <li>Le Concierge ne réserve et ne paie rien à votre place. N&apos;y communiquez ni coordonnées bancaires, ni code Mobile Money, ni données sensibles.</li>
              <li>Son usage est limité en nombre de messages par heure et par jour.</li>
            </ul>
          ),
        },
        {
          id: "avis",
          titre: "Avis et modération",
          contenu: (
            <ul>
              <li>Seul un voyageur ayant séjourné peut évaluer un logement, une fois, dans les 60 jours après son départ.</li>
              <li>L&apos;hôte peut répondre publiquement une fois à chaque avis.</li>
              <li>
                AfriStay peut retirer un avis ou un message qui contient des propos injurieux, discriminatoires, des données
                personnelles ou des contenus sans rapport avec le séjour. Un avis n&apos;est jamais retiré au seul motif qu&apos;il est négatif.
              </li>
            </ul>
          ),
        },
        {
          id: "suspension",
          titre: "Suspension et fermeture de compte",
          contenu: (
            <p>
              En cas de manquement grave aux présentes conditions (fraude, annonce trompeuse, comportement abusif), AfriStay peut
              masquer une annonce, annuler une réservation ou désactiver un compte. La décision est motivée et vous pouvez la contester
              en écrivant à <LienContact sujet="Contestation d'une décision" />.
            </p>
          ),
        },
        {
          id: "responsabilite",
          titre: "Responsabilité",
          contenu: (
            <p>
              AfriStay met tout en œuvre pour assurer la disponibilité et la sécurité du service, sans pouvoir garantir une absence
              totale d&apos;interruption. AfriStay n&apos;est pas responsable de l&apos;exécution du séjour, qui relève de l&apos;hôte, mais
              s&apos;engage à traiter les signalements et à modérer les contenus qui lui sont signalés.
            </p>
          ),
        },
        {
          id: "propriete",
          titre: "Propriété intellectuelle",
          contenu: (
            <p>
              La marque, le logo et le site AfriStay sont protégés. Les contenus publiés par les utilisateurs (textes, photos) restent
              leur propriété ; en les publiant, ils accordent à AfriStay le droit de les afficher sur la plateforme pendant la durée de
              publication.
            </p>
          ),
        },
        {
          id: "droit",
          titre: "Modification des conditions et droit applicable",
          contenu: (
            <p>
              Toute modification importante de ces conditions vous sera notifiée avant son entrée en vigueur. Les présentes conditions sont
              soumises au droit <AC>pays dont le droit s&apos;applique</AC>. En cas de litige, une solution amiable sera recherchée en priorité ;
              à défaut, les tribunaux compétents seront ceux de <AC>ville / juridiction</AC>, sous réserve des règles protectrices applicables
              aux consommateurs.
            </p>
          ),
        },
      ]}
    />
  );
}
