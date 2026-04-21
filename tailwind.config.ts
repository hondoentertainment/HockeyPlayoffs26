import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ice: "#DDEBF7",
        playoff: "#1F3864"
      }
    }
  },
  plugins: []
};

export default config;
