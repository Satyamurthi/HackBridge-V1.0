import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#030407",
        surface: "#0B0E18",
        surfaceElevated: "#111524",
        borderSubtle: "rgba(255, 255, 255, 0.08)",
        // Single Accent: Indigo #6366F1 per DESIGN-SYSTEM.md
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          subtle: "rgba(99, 102, 241, 0.12)",
          border: "rgba(99, 102, 241, 0.25)",
        },
        indigo: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          subtle: "rgba(99, 102, 241, 0.12)",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
        },
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Plus Jakarta Sans", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 20px 50px rgba(0, 0, 0, 0.6)",
        elevated: "0 24px 60px rgba(0, 0, 0, 0.65)",
        indigoGlow: "0 10px 30px -4px rgba(99, 102, 241, 0.25)",
      },
      backdropBlur: {
        glass: "24px",
      },
    },
  },
  plugins: [],
};

export default config;
