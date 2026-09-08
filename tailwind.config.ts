import type { Config } from "tailwindcss";

// FGC Design System 2.0 — broadcast-grade competitive UI tokens.
// Semantic names stay stable so product/data flows remain independent of visual direction.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          950: "#07070B",
          900: "#0E0F15",
          800: "#151722",
          700: "#202230",
          600: "#2C2E3D",
          500: "#3B3E52",
        },
        corner: {
          p1: "#FF5B7F",
          p2: "#6C63FF",
        },
        signal: {
          live: "#20E0A4",
          warn: "#FFB84D",
          error: "#FF5470",
        },
        ink: {
          DEFAULT: "#F7F7FB",
          muted: "#A6A8B7",
          faint: "#6D7082",
        },
      },
      fontFamily: {
        display: ["Impact", "Haettenschweiler", "Arial Narrow Bold", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "12px",
        panel: "16px",
        shell: "22px",
      },
      boxShadow: {
        panel: "0 18px 55px rgba(0,0,0,.28)",
        elevated: "0 28px 90px rgba(0,0,0,.38)",
        signal: "0 0 48px rgba(32,224,164,.10)",
        violet: "0 0 48px rgba(108,99,255,.12)",
      },
      backgroundImage: {
        "arena-radial": "radial-gradient(circle at 50% -20%, rgba(108,99,255,.12), transparent 36rem)",
        "signal-radial": "radial-gradient(circle at 90% 0%, rgba(32,224,164,.07), transparent 30rem)",
        "broadcast-grid": "linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
