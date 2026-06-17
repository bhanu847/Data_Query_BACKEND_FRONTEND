/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0F172A",
        brand: { DEFAULT: "#2563EB", dark: "#1D4ED8", soft: "#EFF4FF" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 12px 32px -12px rgba(16,24,40,.12)",
      },
    },
  },
  plugins: [],
};
