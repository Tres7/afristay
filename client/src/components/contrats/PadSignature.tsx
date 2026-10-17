"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Type } from "lucide-react";
import { useTranslations } from "next-intl";

const HAUTEUR = 180;
const ENCRE = "#1E2A4A";

/** Zone de signature : au doigt, au stylet ou à la souris ; ou le nom tapé, écrit en manuscrit (accessibilité).
 *  `onChange` reçoit l'image PNG (data URL), ou null si la zone est vide. */
export default function PadSignature({ onChange, nom, desactive }: { onChange: (png: string | null) => void; nom: string; desactive?: boolean }) {
  const t = useTranslations("contrat");
  const canvas = useRef<HTMLCanvasElement>(null);
  const dessin = useRef<{ x: number; y: number } | null>(null);
  const [vide, setVide] = useState(true);
  // Le parent peut passer une nouvelle fonction à chaque rendu : la zone ne doit pas s'effacer pour autant
  const rappel = useRef(onChange);
  useEffect(() => { rappel.current = onChange; }, [onChange]);

  const contexte = useCallback(() => canvas.current?.getContext("2d") ?? null, []);

  // Résolution adaptée à l'écran (trait net sur mobile) ; redimensionner efface la signature
  const preparer = useCallback(() => {
    const c = canvas.current;
    const ctx = contexte();
    if (!c || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = HAUTEUR * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ENCRE;
    ctx.fillStyle = ENCRE;
    ctx.lineWidth = 2.4;
    setVide(true);
    rappel.current(null);
  }, [contexte]);

  useEffect(() => {
    preparer();
    let largeur = canvas.current?.clientWidth;
    const observateur = new ResizeObserver(() => {
      if (canvas.current && canvas.current.clientWidth !== largeur) {
        largeur = canvas.current.clientWidth;
        preparer();
      }
    });
    if (canvas.current) observateur.observe(canvas.current);
    return () => observateur.disconnect();
  }, [preparer]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const terminer = () => {
    if (!dessin.current) return;
    dessin.current = null;
    setVide(false);
    rappel.current(canvas.current!.toDataURL("image/png"));
  };

  const effacer = () => {
    const c = canvas.current;
    const ctx = contexte();
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setVide(true);
    rappel.current(null);
  };

  const ecrireNom = () => {
    const c = canvas.current;
    const ctx = contexte();
    if (!c || !ctx || !nom.trim()) return;
    ctx.clearRect(0, 0, c.width, c.height);
    let taille = 46;
    ctx.font = `italic ${taille}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`;
    while (ctx.measureText(nom).width > c.clientWidth - 40 && taille > 18) {
      taille -= 2;
      ctx.font = `italic ${taille}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`;
    }
    ctx.textBaseline = "middle";
    ctx.fillText(nom.trim(), 20, HAUTEUR / 2);
    setVide(false);
    rappel.current(c.toDataURL("image/png"));
  };

  return (
    <div>
      <div className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-white focus-within:border-primary">
        <canvas
          ref={canvas}
          role="img"
          aria-label={t("zoneSignature")}
          className="block w-full touch-none cursor-crosshair rounded-2xl"
          style={{ height: HAUTEUR }}
          onPointerDown={(e) => {
            if (desactive) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = point(e);
            dessin.current = p;
            const ctx = contexte();
            ctx?.beginPath();
            ctx?.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
            ctx?.fill();
          }}
          onPointerMove={(e) => {
            if (!dessin.current) return;
            const ctx = contexte();
            const p = point(e);
            ctx?.beginPath();
            ctx?.moveTo(dessin.current.x, dessin.current.y);
            ctx?.lineTo(p.x, p.y);
            ctx?.stroke();
            dessin.current = p;
          }}
          onPointerUp={terminer}
          onPointerCancel={terminer}
          onPointerLeave={terminer}
        />
        {vide && (
          <span className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-gray-400">{t("signezIci")}</span>
        )}
        <span className="pointer-events-none absolute left-5 right-5 bottom-12 border-b border-gray-200" aria-hidden />
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <button type="button" onClick={effacer} disabled={desactive || vide}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full border border-gray-200 text-sm font-medium text-dark hover:bg-gray-50 disabled:opacity-40">
          <Eraser size={15} aria-hidden /> {t("effacer")}
        </button>
        <button type="button" onClick={ecrireNom} disabled={desactive || !nom.trim()}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full border border-gray-200 text-sm font-medium text-dark hover:bg-gray-50 disabled:opacity-40">
          <Type size={15} aria-hidden /> {t("signerAvecNom")}
        </button>
      </div>
    </div>
  );
}
