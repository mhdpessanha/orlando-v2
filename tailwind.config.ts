import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: { deep: "#070b26", mid: "#101641", violet: "#1d1550" },
        ink: { DEFAULT: "#f3f1ff", soft: "#d6d3f0", muted: "#a5a3c8", faint: "#8b89b0" },
        lavanda: "#b7a9e8",
        gold: { DEFAULT: "#f6c453", light: "#ffd97a", deep: "#d98a2b" },
        park: {
          mk: "#8f7bff",
          ep: "#57c7d8",
          ak: "#5fbf7a",
          hs: "#ff8f66",
          usf: "#f2b344",
          ioa: "#e06a8a",
          epic: "#6f8dff",
          sw: "#4fa3e0",
          peppa: "#f08bb6",
        },
        nucleo: { pessanha: "#f6c453", gabi: "#ff8a7a", vm: "#5fd0c5" },
        surface: "rgba(255,255,255,0.06)",
        stroke: "rgba(255,255,255,0.13)",
      },
      fontFamily: {
        display: ["var(--font-fredoka)", "Avenir Next", "Trebuchet MS", "sans-serif"],
        sans: ["var(--font-nunito)", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        "card-lg": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
