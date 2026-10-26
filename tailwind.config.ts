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
        void: "#030407",
        background: "#030407",
        surface: "#0B0E18",
        surfaceElevated: "#111524",
        borderDark: "rgba(255, 255, 255, 0.08)",
        borderSubtle: "rgba(255, 255, 255, 0.05)",
        // Single curated surgical accent color from DESIGN.md
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          subtle: "rgba(99, 102, 241, 0.10)",
          border: "rgba(99, 102, 241, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Plus Jakarta Sans", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      backdropBlur: {
        glass: "32px",
      },
    },
  },
  plugins: [],
};
export default config;
