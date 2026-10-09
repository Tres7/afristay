import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { AC, AValider } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <LegalPage
      titre="Politique de confidentialité (RGPD)"
      miseAJour="7 octobre 2026"
      intro={
        <>
          <p>
            Cette politique explique quelles données personnelles AfriStay collecte, pourquoi, combien de temps elles sont
            conservées et comment exercer vos droits, conformément au Règlement général sur la protection des données (RGPD)
            et aux lois applicables en matière de protection des données dans les pays où AfriStay est proposé.
          </p>
          <p>Nous ne collectons que les données nécessaires au service. Nous ne vendons aucune donnée et n&apos;utilisons aucun outil publicitaire.</p>
        </>
      }
      sections={[
        {
          id: "responsable",
          titre: "Responsable du traitement",
          contenu: (
            <ul>
              <li>Responsable : <AC>raison sociale et forme juridique</AC>, <AC>adresse du siège</AC>.</li>
              <li>Contact pour la protection des données : <AC>adresse email dédiée, par ex. donnees@afristay.com</AC>.</li>
              <li>Délégué à la protection des données (si désigné) : <AC>nom ou « non désigné »</AC>.</li>
            </ul>
          ),
        },
        {
          id: "donnees",
          titre: "Données collectées et finalités",
          contenu: (
            <table>
              <thead><tr><th>Données</th><th>Pourquoi</th><th>Base légale</th></tr></thead>
              <tbody>
                <tr><td>Prénom, nom, email, mot de passe (stocké chiffré, jamais lisible), rôle (voyageur ou hôte)</td><td>Créer et sécuriser votre compte</td><td>Exécution du contrat (CGU)</td></tr>
                <tr><td>Téléphone (facultatif)</td><td>Faciliter le contact lié à une réservation</td><td>Consentement (champ facultatif)</td></tr>
                <tr><td>Identifiant et photo de profil Google (uniquement si vous utilisez « Continuer avec Google »)</td><td>Connexion simplifiée</td><td>Exécution du contrat</td></tr>
                <tr><td>Réservations : dates, nombre de voyageurs, montant, mode de paiement choisi, message à l&apos;hôte</td><td>Gérer votre séjour et le transmettre à l&apos;hôte</td><td>Exécution du contrat</td></tr>
                <tr><td>Paiements : montant, statut, identifiant de la transaction chez FedaPay ou PayPal, opérateur et numéro Mobile Money débité</td><td>Encaisser le séjour, vous rembourser sur le même moyen de paiement, comptabilité</td><td>Exécution du contrat ; obligation légale (comptabilité)</td></tr>
                <tr><td>Transferts aéroport : aéroport, heure et numéro de vol, passagers, bagages, adresse de destination, numéro de téléphone, message au chauffeur</td><td>Organiser la prise en charge à l&apos;aéroport</td><td>Exécution du contrat</td></tr>
                <tr><td>Chauffeurs partenaires : identité, téléphone, véhicule, immatriculation, compte Mobile Money</td><td>Attribuer les courses et payer les chauffeurs</td><td>Exécution du contrat</td></tr>
                <tr><td>Hôtes : pays, opérateur, numéro Mobile Money et nom du titulaire</td><td>Verser à l&apos;hôte le prix de ses séjours</td><td>Exécution du contrat</td></tr>
                <tr><td>Messages échangés avec les hôtes ou les voyageurs</td><td>Messagerie et notifications par email</td><td>Exécution du contrat</td></tr>
                <tr><td>Avis et notes (publiés avec votre prénom et l&apos;initiale de votre nom)</td><td>Informer les autres voyageurs</td><td>Intérêt légitime (fiabilité des avis)</td></tr>
                <tr><td>Favoris</td><td>Retrouver les logements sauvegardés</td><td>Exécution du contrat</td></tr>
                <tr><td>Hôtes : annonces, photos (métadonnées et position GPS supprimées à l&apos;envoi), calendrier</td><td>Publier et gérer les logements</td><td>Exécution du contrat</td></tr>
                <tr><td>Codes de vérification temporaires, nombre de tentatives</td><td>Vérifier votre email, sécuriser la réinitialisation du mot de passe, bloquer les abus</td><td>Intérêt légitime (sécurité)</td></tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "pas-collecte",
          titre: "Ce que nous ne collectons pas",
          contenu: (
            <ul>
              <li>Aucun numéro de carte bancaire ni code Mobile Money : le paiement est saisi directement sur les pages sécurisées de FedaPay ou de PayPal.</li>
              <li>Aucune mesure d&apos;audience, aucun traceur publicitaire, aucun profilage.</li>
              <li>Aucune pièce d&apos;identité, aucune date de naissance, aucune donnée sensible.</li>
              <li>La répartition adultes / enfants saisie lors d&apos;une recherche n&apos;est pas enregistrée : seul le nombre total de voyageurs l&apos;est.</li>
            </ul>
          ),
        },
        {
          id: "destinataires",
          titre: "Destinataires et sous-traitants",
          contenu: (
            <ul>
              <li>L&apos;<strong>hôte</strong> du logement que vous réservez reçoit votre nom, les détails de la réservation et votre message.</li>
              <li>Le <strong>chauffeur partenaire</strong> d&apos;un transfert reçoit votre nom, votre numéro de téléphone, votre numéro de vol, le nombre de passagers et de bagages, l&apos;adresse de destination et votre message.</li>
              <li>Les <strong>administrateurs</strong> d&apos;AfriStay, pour la modération et l&apos;assistance (accès restreint et tracé).</li>
              <li>Hébergement du site et des données : <AC>nom, adresse et pays de l&apos;hébergeur</AC>.</li>
              <li>Envoi des emails (codes, notifications) : <AC>prestataire d&apos;envoi d&apos;emails</AC>.</li>
              <li><strong>FedaPay</strong> (Bénin) : encaissement Mobile Money et carte, versements aux hôtes et remboursements. Reçoit votre nom, votre email, le montant et, pour les hôtes, le numéro de versement.</li>
              <li><strong>PayPal</strong> (Europe) : uniquement si vous choisissez ce moyen de paiement. Reçoit le montant et la référence de la réservation.</li>
              <li>Google : uniquement si vous utilisez la connexion Google ou acceptez l&apos;affichage de la carte (voir la <Link href="/cookies">politique cookies</Link>). Google peut traiter des données hors de l&apos;Union européenne, dans le cadre du Data Privacy Framework UE–États-Unis.</li>
              <li>Unsplash : certaines photos d&apos;illustration sont chargées depuis ses serveurs, qui reçoivent alors votre adresse IP.</li>
            </ul>
          ),
        },
        {
          id: "durees",
          titre: "Durées de conservation",
          contenu: (
            <ul>
              <li>Codes de vérification : 10 minutes. Choix de cookies : 6 mois.</li>
              <li>Compte : tant qu&apos;il est actif ; <AValider>supprimé ou anonymisé après 3 ans sans connexion.</AValider></li>
              <li>Réservations : <AValider>durée de la relation, puis 5 ans (délai de prescription).</AValider></li>
              <li>Paiements, versements et remboursements : <AValider>10 ans (pièces comptables).</AValider></li>
              <li>Messages : <AValider>3 ans après le dernier message de la conversation.</AValider></li>
              <li>Avis : tant que le logement est publié, ou jusqu&apos;à leur suppression par modération.</li>
              <li>Journaux techniques de sécurité : <AValider>1 an.</AValider></li>
            </ul>
          ),
        },
        {
          id: "droits",
          titre: "Vos droits",
          contenu: (
            <>
              <p>Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité de vos données, ainsi que du droit de retirer votre consentement à tout moment.</p>
              <ul>
                <li>Modifier vos informations : <Link href="/profil/edit">Mon profil → Mes informations</Link>.</li>
                <li>Fermer votre compte : depuis la même page, rubrique « Fermer mon compte ».</li>
                <li>Obtenir une copie de vos données ou leur effacement définitif : écrivez à <AC>adresse email dédiée</AC>. Réponse sous un mois maximum.</li>
              </ul>
              <p>
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l&apos;autorité de protection des données
                compétente : la CNIL en France (<a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr</a>),
                ou l&apos;autorité de votre pays (par exemple l&apos;ARTCI en Côte d&apos;Ivoire, la CDP au Sénégal, l&apos;IPDCP au Togo).
              </p>
            </>
          ),
        },
        {
          id: "securite",
          titre: "Sécurité",
          contenu: (
            <ul>
              <li>Mots de passe chiffrés (hachage), jamais stockés en clair.</li>
              <li>Session de connexion dans un cookie inaccessible aux scripts ; jeton d&apos;accès renouvelé toutes les heures.</li>
              <li>Limitation des tentatives sur les codes de vérification et sur l&apos;envoi de messages.</li>
              <li>Photos envoyées par les hôtes nettoyées de leurs métadonnées (dont la position GPS).</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
