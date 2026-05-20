import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18212d",
        sand: "#f4efe6",
        moss: "#6b7b58",
        clay: "#b86f52",
        mist: "#e3e8ef",
        pearl: "#fbfaf7",
        slate: "#2d3847"
      },
      boxShadow: {
        card: "0 22px 60px rgba(24, 33, 45, 0.10)",
        float: "0 30px 80px rgba(24, 33, 45, 0.14)",
        innerGlow: "inset 0 1px 0 rgba(255,255,255,0.8)"
      },
      backgroundImage: {
        'panel-glow': 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.78))'
      }
    }
  },
  plugins: []
};

export default config;
