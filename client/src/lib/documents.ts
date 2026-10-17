import axios from "axios";
import api, { apiErrorMessage } from "@/lib/api";
import type { FactureAdmin } from "@/types/api/admin";

export type ObjetDocument = "reservation" | "transfert" | "location" | "don";
export type TypeDocument = "bon" | "recu" | "facture";

/** Nom proposé par le serveur (Content-Disposition), sinon un nom par défaut. */
function nomFichier(entete: string | undefined, defaut: string): string {
  const nom = entete?.match(/filename="?([^";]+)"?/)?.[1];
  return nom || defaut;
}

/** Télécharge un PDF de l'API (requête authentifiée) et l'enregistre sur l'appareil. */
export async function telechargerPdf(url: string, defaut: string): Promise<void> {
  const res = await api.get<Blob>(url, { responseType: "blob" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(res.data);
  lien.download = nomFichier(res.headers["content-disposition"] as string | undefined, defaut);
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 10_000);
}

export function telechargerDocument(objet: ObjetDocument, id: string, doc: TypeDocument) {
  return telechargerPdf(`/v1/documents/${objet}/${id}/${doc}/`, `${doc}-${id}.pdf`);
}

/** Message d'erreur d'un téléchargement : la réponse d'un PDF est un Blob, le JSON est à relire. */
export async function messageErreurPdf(err: unknown, defaut?: string): Promise<string> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const corps = JSON.parse(await err.response.data.text()) as { detail?: string };
      if (corps.detail) return corps.detail;
    } catch { /* corps non JSON */ }
    if (defaut) return defaut;
  }
  return apiErrorMessage(err, defaut);
}

export function telechargerFacture(f: Pick<FactureAdmin, "id" | "numero">) {
  return telechargerPdf(`/v1/admin/documents/factures/${f.id}/pdf/`, `facture-${f.numero}.pdf`);
}

/** Back-office : facture d'un séjour, transfert ou location payé (émise une seule fois), puis téléchargée. */
export async function factureDe(objet: Exclude<ObjetDocument, "don">, id: string): Promise<FactureAdmin> {
  const { data } = await api.post<FactureAdmin>("/v1/admin/documents/factures/", { objet_type: objet, objet_id: id });
  await telechargerFacture(data);
  return data;
}
