"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { factureDe, messageErreurPdf } from "@/lib/documents";
import { ActionButton } from "@/components/backoffice/AdminTable";

/** Émet (une seule fois) puis télécharge la facture d'un séjour, transfert ou location payé. */
export default function BoutonFacture({ objet, id }: { objet: "reservation" | "transfert" | "location"; id: string }) {
  const queryClient = useQueryClient();
  const [envoi, setEnvoi] = useState(false);
  return (
    <ActionButton disabled={envoi} onClick={async () => {
      setEnvoi(true);
      try {
        await factureDe(objet, id);
        queryClient.invalidateQueries({ queryKey: ["admin", "documents/factures"] });
      } catch (err) {
        toast.error(await messageErreurPdf(err));
      } finally {
        setEnvoi(false);
      }
    }}>
      {envoi ? "…" : "Facture"}
    </ActionButton>
  );
}
