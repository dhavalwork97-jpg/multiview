import type { Config } from "tailwindcss";

// Design tokens for the "broadcast control room" direction:
// near-black arena background, red/blue player-corner accents (the
// universal fighting-game P1/P2 convention), a signal-green LIVE pulse,
// and a mono face for anything that reads like a scoreboard (scores,
// station labels, timestamps, bitrate).
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          950: "#0A0B0F",
          900: "#101218",
          800: "#14161C",
          700: "#1D2029",
          600: "#2A2E3A",
        },
        corner: {
          p1: "#E8384F", // crimson — player one
          p2: "#3E8EF7", // electric blue — player two
        },
        signal: {
          live: "#3ADE7C",
          warn: "#F5B942",
          error: "#EF4444",
        },
        ink: {
          DEFAULT: "#F2F1ED",
          muted: "#9CA0AE",
          faint: "#5B5F6E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
} satisfies Config;
