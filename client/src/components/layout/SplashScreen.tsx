"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
            {/* Icône Adinkra */}
            <motion.div
              animate={{ rotate: [0, 90, 90] }}
              transition={{ delay: 0.4, duration: 0.5, ease: "easeInOut" }}
            >
              <svg width="72" height="72" viewBox="0 0 30 30" fill="none">
                <defs>
                  <linearGradient id="splash-lg" x1="0" y1="0" x2="30" y2="30">
                    <stop stopColor="#E67E22" />
                    <stop offset="1" stopColor="#F39C12" />
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="24" height="24" rx="3" transform="rotate(45 15 15)" fill="url(#splash-lg)" opacity="0.15" />
                <rect x="6" y="6" width="18" height="18" rx="2" transform="rotate(45 15 15)" stroke="url(#splash-lg)" strokeWidth="1.5" fill="none" />
                <rect x="10" y="10" width="10" height="10" rx="1.5" transform="rotate(45 15 15)" fill="url(#splash-lg)" />
              </svg>
            </motion.div>

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.45 }}
              className="font-heading font-black text-4xl tracking-tight leading-none"
            >
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #E67E22 0%, #F39C12 100%)" }}
              >
                Afri
              </span>
              <span className="text-[#2C3E50] dark:text-white">Stay</span>
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.4 }}
              className="text-sm text-gray-400 font-body tracking-wide"
            >
              L&apos;Afrique à portée de clic
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
              style={{ background: "linear-gradient(90deg, #E67E22, #F39C12)" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
