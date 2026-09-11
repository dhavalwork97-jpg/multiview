export type BroadcastAnimation =
  | "fade-in"
  | "slide-up"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "versus-slam"
  | "countdown-pulse"
  | "winner-burst"
  | "replay-sweep"
  | "sponsor-marquee";

export type BroadcastAnimationPreset = {
  name: BroadcastAnimation;
  durationMs: number;
  easing: string;
  delayMs?: number;
};

export const BROADCAST_ANIMATIONS: Record<BroadcastAnimation, BroadcastAnimationPreset> = {
  "fade-in": { name: "fade-in", durationMs: 450, easing: "cubic-bezier(.22,1,.36,1)" },
  "slide-up": { name: "slide-up", durationMs: 650, easing: "cubic-bezier(.16,1,.3,1)" },
  "slide-left": { name: "slide-left", durationMs: 650, easing: "cubic-bezier(.16,1,.3,1)" },
  "slide-right": { name: "slide-right", durationMs: 650, easing: "cubic-bezier(.16,1,.3,1)" },
  "scale-in": { name: "scale-in", durationMs: 550, easing: "cubic-bezier(.16,1,.3,1)" },
  "versus-slam": { name: "versus-slam", durationMs: 900, easing: "cubic-bezier(.16,1,.3,1)" },
  "countdown-pulse": { name: "countdown-pulse", durationMs: 850, easing: "cubic-bezier(.16,1,.3,1)" },
  "winner-burst": { name: "winner-burst", durationMs: 1100, easing: "cubic-bezier(.16,1,.3,1)" },
  "replay-sweep": { name: "replay-sweep", durationMs: 700, easing: "cubic-bezier(.16,1,.3,1)" },
  "sponsor-marquee": { name: "sponsor-marquee", durationMs: 600, easing: "cubic-bezier(.16,1,.3,1)" },
};

export function animationForScene(scene: string): BroadcastAnimation {
  switch (scene) {
    case "starting-soon": return "countdown-pulse";
    case "intro": return "scale-in";
    case "versus": return "versus-slam";
    case "winner":
    case "champion": return "winner-burst";
    case "replay": return "replay-sweep";
    default: return "fade-in";
  }
}
