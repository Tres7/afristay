import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // New Palette matching Mockups
        primary: {
          DEFAULT: '#E67E22', // Vivid orange from the logo
          50: '#FDF7F2',
          100: '#FAECDE',
          200: '#F1D1B0',
          300: '#EAB380',
          400: '#E29753',
          500: '#E67E22',
          600: '#CC6C1B',
          700: '#B05915',
          800: '#8F4711',
          900: '#753C10',
        },
        dark: {
          DEFAULT: '#1E293B', // Slate 800 - Deep dark grey for text
          muted: '#475569',   // Slate 600
        },
        light: {
          DEFAULT: '#FFFDF8', // Warm cream background from the mockup
          muted: '#F8F5F0',   // Slightly darker cream for cards/sections
        },
        // Semantic Colors
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        danger: '#EF4444',  // Red 500
      },
      fontFamily: {
        heading: ["Poppins", "Inter", "sans-serif"],
        body: ["Inter", "Roboto", "sans-serif"],
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
