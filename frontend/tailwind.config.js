/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#E8EDF7",
        surface: "#060810",
        "surface-1": "rgba(255,255,255,0.035)",
        "surface-2": "rgba(255,255,255,0.06)",
        "surface-3": "rgba(255,255,255,0.1)",
        border: "rgba(255,255,255,0.08)",
        "border-2": "rgba(255,255,255,0.14)",
        muted: "#8A94A8",
        "muted-2": "#6E7894",
        brand: { DEFAULT: "#22D3EE", dark: "#0891B2", soft: "rgba(34,211,238,0.1)" },
        accent: { indigo: "#6366F1", emerald: "#34D399", rose: "#FB7185", amber: "#FBBF24", sky: "#38BDF8", violet: "#A78BFA", lime: "#4ADE80", orange: "#FB923C", teal: "#2DD4BF" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.2), 0 12px 32px -12px rgba(0,0,0,.5)",
        glow: "0 8px 30px rgba(34,211,238,0.35)",
        "glow-sm": "0 4px 18px rgba(34,211,238,0.3)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #22D3EE, #6366F1)",
        "gradient-emerald": "linear-gradient(135deg, #34D399, #22D3EE)",
        "gradient-warm": "linear-gradient(135deg, #FBBF24, #FB923C)",
      },
    },
  },
  plugins: [],
};
