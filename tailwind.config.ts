import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        unica: {
          DEFAULT: "var(--unica)",
          hover: "var(--unica-hover)",
          soft: "var(--unica-soft)",
          wash: "var(--unica-wash)",
          mist: "var(--unica-mist)",
        },
        ink: "var(--ink)",
        mute: "var(--muted)",
        line: "var(--line)",
        canvas: "var(--bg)",
        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "Helvetica Neue", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30, 26, 36, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
