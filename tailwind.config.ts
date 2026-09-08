import type { Config } from "tailwindcss";

// FGC design system: broadcast-control-room visual language shared by
// organizer surfaces, viewer experiences, live overlays, and data UI.
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
        control: "6px",
        pill: "9999px",
      },
      boxShadow: {
        surface: "0 12px 36px rgba(0,0,0,.16)",
        elevated: "0 16px 42px rgba(0,0,0,.24)",
        focus: "0 0 0 3px rgba(58,222,124,.18)",
      },
      spacing: {
        gutter: "var(--ui-content-gutter)",
        section: "var(--ui-section-gap)",
      },
    },
  },
  plugins: [],
} satisfies Config;
