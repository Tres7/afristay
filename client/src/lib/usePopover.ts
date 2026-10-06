import { useEffect, useRef, useState } from "react";

/**
 * Ouverture d'un panneau flottant : fermeture au clic extérieur et à la touche Échap.
 * `ref` entoure le déclencheur ; `panelRef` le panneau (qui peut être rendu ailleurs dans la page via un portail).
 */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (ref.current?.contains(cible) || panelRef.current?.contains(cible)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref, panelRef };
}
