import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2a37",
        sand: "#f4efe6",
        moss: "#6b7b58",
        clay: "#b86f52",
        mist: "#e3e8ef"
      },
      boxShadow: {
        card: "0 18px 45px rgba(31, 42, 55, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
