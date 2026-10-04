import { useEffect, useRef } from "react";

/**
 * Appelle `callback` toutes les `intervalMs` millisecondes :
 * - jamais deux appels en parallèle (le suivant est planifié à la fin du précédent) ;
 * - en pause quand l'onglet est masqué ;
 * - appel immédiat au retour sur l'onglet ou quand la fenêtre reprend le focus
 *   (cas de deux fenêtres côte à côte, où l'onglet reste visible en permanence).
 */
export function usePolling(callback: () => Promise<void> | void, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let running = false;

    const tick = async () => {
      if (running || cancelled) return;
      running = true;
      try {
        if (document.visibilityState === "visible") await savedCallback.current();
      } catch {
        // Erreur réseau ponctuelle : on réessaie au prochain tick
      } finally {
        running = false;
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      }
    };

    const refreshNow = () => {
      if (document.visibilityState === "visible" && !running) {
        clearTimeout(timer);
        tick();
      }
    };

    timer = setTimeout(tick, intervalMs);
    document.addEventListener("visibilitychange", refreshNow);
    window.addEventListener("focus", refreshNow);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshNow);
      window.removeEventListener("focus", refreshNow);
    };
  }, [intervalMs, enabled]);
}
