import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ice: "#DDEBF7",
        round2: "#FCE4D6",
        conf: "#E4DFEC",
        final: "#FFE699",
        input: "#FFF2CC",
        formula: "#E2EFDA",
        header: "#1F3864",
        sub: "#2E75B6",
      },
    },
  },
  plugins: [],
};

export default config;
