"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Contenu de l'en-tête (logo par exemple). */
  header?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Panneau latéral mobile, rendu dans <body> : il couvre toute la hauteur de l'écran quel que soit
 * le parent (un parent avec backdrop-filter ou transform « emprisonne » sinon les éléments en position fixe).
 */
export default function MobileDrawer({ open, onClose, label, header, children }: MobileDrawerProps) {
  const [monte, setMonte] = useState(false);
  const panneau = useRef<HTMLDivElement>(null);

  useEffect(() => setMonte(true), []);

  useEffect(() => {
    if (!open) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Focus dans le panneau pour la navigation au clavier et les lecteurs d'écran
    const t = setTimeout(() => panneau.current?.querySelector<HTMLElement>("a, button")?.focus(), 50);
    return () => {
      document.body.style.overflow = precedent;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!monte) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            className="absolute inset-0 bg-dark/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panneau}
            className="absolute inset-y-0 right-0 w-[min(22rem,88vw)] bg-white shadow-2xl flex flex-col"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="flex items-center justify-between gap-3 px-5 h-16 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0">{header}</div>
              <button type="button" onClick={onClose} aria-label="Fermer le menu" className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-dark hover:bg-gray-100">
                <X size={22} />
              </button>
            </div>
            <motion.div
              className="flex-1 overflow-y-auto px-5 py-5"
              initial="cache" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } } }}
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Élément du menu qui apparaît en glissant légèrement (effet en cascade). */
export function DrawerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ cache: { opacity: 0, x: 16 }, visible: { opacity: 1, x: 0 } }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
