import type { Config } from "tailwindcss";

// FGC Design System 2.0 tokens. Keep semantic names stable so product surfaces
// can evolve without coupling UI decisions to individual pages.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          950: "#08090C",
          900: "#101218",
          800: "#151821",
          700: "#1E222D",
          600: "#2A2F3B",
          500: "#39404D",
        },
        corner: {
          p1: "#E8384F",
          p2: "#3E8EF7",
        },
        signal: {
          live: "#3ADE7C",
          warn: "#F5B942",
          error: "#EF4444",
        },
        ink: {
          DEFAULT: "#F2F1ED",
          muted: "#A4A8B5",
          faint: "#626776",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "10px",
        panel: "16px",
        shell: "24px",
      },
      boxShadow: {
        panel: "0 16px 48px rgba(0,0,0,.20)",
        elevated: "0 24px 70px rgba(0,0,0,.30)",
        signal: "0 0 42px rgba(58,222,124,.08)",
      },
      backgroundImage: {
        "arena-radial": "radial-gradient(circle at 50% -20%, rgba(62,142,247,.08), transparent 36rem)",
        "signal-radial": "radial-gradient(circle at 90% 0%, rgba(58,222,124,.06), transparent 30rem)",
      },
    },
  },
  plugins: [],
} satisfies Config;
