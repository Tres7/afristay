"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLocale } from "next-intl";
import api from "@/lib/api";

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let chargement: Promise<void> | null = null;

function chargerScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  chargement ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      chargement = null;
      reject(new Error("Turnstile"));
    };
    document.head.appendChild(script);
  });
  return chargement;
}

export interface CaptchaHandle {
  /** Nouveau défi (un jeton ne sert qu'une fois : à appeler après chaque envoi refusé). */
  reset: () => void;
}

interface CaptchaProps {
  /** Jeton à envoyer avec le formulaire, ou null tant que la case n'est pas validée (ou après expiration). */
  onToken: (jeton: string | null) => void;
  /** Captcha désactivé côté serveur (pas de clé) : le formulaire peut partir sans jeton. */
  onInactif?: () => void;
}

/** Case « Je suis humain » (Cloudflare Turnstile), souvent validée sans clic. Clé lue sur l'API au chargement. */
const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(function Captcha({ onToken, onInactif }, ref) {
  const locale = useLocale();
  const zone = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [indisponible, setIndisponible] = useState(false);
  // Les callbacks changent à chaque rendu du parent : le widget lit toujours la dernière version
  const rappels = useRef({ onToken, onInactif });
  rappels.current = { onToken, onInactif };

  useImperativeHandle(ref, () => ({
    reset: () => {
      rappels.current.onToken(null);
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    },
  }));

  // Clé publique lue sur l'API (vide : captcha désactivé) ; le widget est affiché ensuite
  const [cle, setCle] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    api.get<{ site_key: string }>("/v1/auth/captcha/")
      .then(({ data }) => {
        if (annule) return;
        if (!data.site_key) rappels.current.onInactif?.();
        setCle(data.site_key);
      })
      // API injoignable : on laisse envoyer, le serveur décidera (il refuse un jeton manquant si le captcha est actif)
      .catch(() => {
        if (annule) return;
        setIndisponible(true);
        rappels.current.onInactif?.();
      });
    return () => { annule = true; };
  }, []);

  useEffect(() => {
    if (!cle) return;
    let annule = false;
    chargerScript()
      .then(() => {
        if (annule || !zone.current || !window.turnstile) return;
        widget.current = window.turnstile.render(zone.current, {
          sitekey: cle,
          language: locale,
          theme: "light",
          callback: (jeton: string) => rappels.current.onToken(jeton),
          "expired-callback": () => rappels.current.onToken(null),
          "error-callback": () => rappels.current.onToken(null),
        });
      })
      .catch(() => {
        if (annule) return;
        setIndisponible(true);
        rappels.current.onInactif?.();
      });
    return () => {
      annule = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [cle, locale]);

  if (indisponible || !cle) return null;
  return <div ref={zone} className="flex justify-center min-h-[65px]" />;
});

export default Captcha;
