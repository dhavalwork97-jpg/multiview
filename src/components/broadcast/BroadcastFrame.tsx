import type { ReactNode } from "react";
import { getBroadcastTheme } from "@/lib/broadcast/themes";

export function BroadcastFrame({
  game,
  children,
  className = "",
}: {
  game?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const theme = getBroadcastTheme(game);

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[#05060a] text-white ${className}`}
      style={{
        ["--broadcast-accent" as string]: theme.accent,
        ["--broadcast-accent-alt" as string]: theme.accentAlt,
        ["--broadcast-surface" as string]: theme.surface,
        ["--broadcast-glow" as string]: theme.glow,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 12% 18%, ${theme.glow}, transparent 34%), radial-gradient(circle at 88% 82%, ${theme.accentAlt}22, transparent 32%)` }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
