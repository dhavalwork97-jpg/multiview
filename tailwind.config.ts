import type { Config } from "tailwindcss";

// FGC Design System 2.0 — mockup-locked broadcast UI tokens.
// Semantic names stay stable so product/data flows remain independent of the visual direction.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          950: "#050817",
          900: "#080D20",
          800: "#0D1530",
          700: "rgba(122,146,220,.18)",
          600: "rgba(137,112,255,.28)",
          500: "rgba(154,108,255,.42)",
        },
        corner: {
          p1: "#FF3CA8",
          p2: "#6F3CFF",
        },
        signal: {
          live: "#20D9FF",
          warn: "#FFD166",
          error: "#FF5470",
        },
        ink: {
          DEFAULT: "#F7F8FF",
          muted: "#A8AEC8",
          faint: "#69718F",
        },
      },
      fontFamily: {
        display: ["Barlow Condensed", "Arial Narrow", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "12px",
        panel: "16px",
        shell: "22px",
      },
      boxShadow: {
        panel: "0 18px 55px rgba(0,0,0,.28)",
        elevated: "0 28px 90px rgba(0,0,0,.38)",
        signal: "0 0 48px rgba(32,217,255,.10)",
        violet: "0 0 48px rgba(111,60,255,.12)",
      },
      backgroundImage: {
        "arena-radial": "radial-gradient(circle at 50% -20%, rgba(111,60,255,.14), transparent 36rem)",
        "signal-radial": "radial-gradient(circle at 90% 0%, rgba(32,217,255,.07), transparent 30rem)",
        "broadcast-grid": "linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
