"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IconeKwaba from "@/components/layout/IconeKwaba";
import { Logotype } from "@/components/layout/Logo";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem("splash_shown");
    if (!shown) {
      setVisible(true);
      sessionStorage.setItem("splash_shown", "1");
      const t = setTimeout(() => setVisible(false), 2400);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0f172a]"
        >
          {/* Logo animé */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "backOut" }}
            className="flex flex-col items-center gap-4"
          >
            {/* Pictogramme */}
            <motion.div initial={{ y: 8 }} animate={{ y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}>
              <IconeKwaba taille={76} className="rounded-[18px] shadow-card" />
            </motion.div>

            {/* Logotype */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.45 }}
            >
              <Logotype className="text-4xl" />
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.4 }}
              className="text-sm text-gray-600 dark:text-slate-300 font-body tracking-[0.18em]"
            >
              Le monde vous accueille.
            </motion.p>
          </motion.div>

          {/* Barre de chargement */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="absolute bottom-16 w-40 h-1 bg-gray-100 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 1, duration: 1.2, ease: "easeInOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #0E4D47, #F59E0B)" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
