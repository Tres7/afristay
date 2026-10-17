export type TypeContrat = "hote" | "loueur" | "chauffeur" | "ong";
export type StatutContrat = "a_signer" | "signe" | "annule";

export interface BlocContrat {
  type: "titre" | "texte";
  texte: string;
}

/** Contrat vu par le signataire (lien personnel ou espace hôte). */
export interface ContratPublic {
  reference: string | null;
  titre: string;
  type: TypeContrat;
  type_libelle: string;
  statut: StatutContrat;
  partie_nom: string;
  kwaba_signataire: string;
  version: number;
  blocs: BlocContrat[];
  expire_le: string | null;
  expire: boolean;
  signe_le: string | null;
  signataire_nom: string;
}

export interface SignatureContrat {
  nom: string;
  signature: string;
  accepte: boolean;
}
