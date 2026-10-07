import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // New Palette matching Mockups
        primary: {
          // Orange de texte et de bouton : contraste ≥ 4,5:1 (WCAG AA) sur blanc, crème et fonds teintés.
          // L'orange vif de la marque reste disponible en primary-500 (logo, décors).
          DEFAULT: '#A85412',
          50: '#FDF7F2',
          100: '#FAECDE',
          200: '#F1D1B0',
          300: '#EAB380',
          400: '#E29753',
          500: '#E67E22',
          600: '#8F4711',
          700: '#753C10',
          800: '#5E300D',
          900: '#4A260A',
        },
        dark: {
          DEFAULT: '#1E293B', // Slate 800 - Deep dark grey for text
          muted: '#475569',   // Slate 600
        },
        light: {
          DEFAULT: '#FFFDF8', // Warm cream background from the mockup
          muted: '#F8F5F0',   // Slightly darker cream for cards/sections
        },
        secondary: {
          DEFAULT: '#14713A', // vert accessible (≥ 4,5:1 avec du blanc et sur fond vert pâle)
          600: '#0F5A2E',
        },
        accent: '#F39C12',
        muted: '#5F6B6C', // gris secondaire lisible (≥ 5:1)
        // gris-400 relevé : les textes d'aide et indications restent lisibles (≥ 4,5:1)
        gray: { 400: '#6B7280' },
        // Semantic Colors
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        danger: '#EF4444',  // Red 500
      },
      fontFamily: {
        // Polices auto-hébergées par next/font (app/layout.tsx) : aucun appel à Google côté visiteur
        heading: ["var(--font-poppins)", "Poppins", "Inter", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "Roboto", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 20px 40px -5px rgba(0, 0, 0, 0.12)',
        'button': '0 4px 14px 0 rgba(230, 126, 34, 0.39)', // Orange glow
      },
    },
  },
  plugins: [],
};

export default config;
