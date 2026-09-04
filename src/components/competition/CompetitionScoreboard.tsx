import type { ViewerSide } from "@/lib/competition/viewer-state";

function sideLabel(side: ViewerSide) {
  return side.participants.map((participant) => participant.label).join(" / ") || "TBD";
}

function SideRow({ side, align = "left", compact }: { side: ViewerSide; align?: "left" | "right"; compact: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end text-right" : "text-left"}`}>
      <span className={compact ? "min-w-0 truncate text-sm" : "min-w-0 truncate font-display text-lg uppercase"}>
        {sideLabel(side)}
      </span>
      <span className={`${compact ? "text-sm" : "text-xl"} shrink-0 font-mono font-bold tabular-nums text-ink`}>
        {side.score}
      </span>
    </div>
  );
}

export function CompetitionScoreboard({
  sides,
  compact = false,
}: {
  sides: ViewerSide[];
  compact?: boolean;
}) {
  if (sides.length === 0) return null;

  if (sides.length === 2) {
    return (
      <div className={compact ? "flex items-center justify-between gap-3" : "grid grid-cols-[1fr_auto_1fr] items-center gap-4"}>
        <SideRow side={sides[0]} align="left" compact={compact} />
        {!compact && <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">vs</span>}
        {compact && <span className="shrink-0 text-ink-faint">·</span>}
        <SideRow side={sides[1]} align="right" compact={compact} />
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1.5" : "grid gap-2"} aria-label="Competition scoreboard">
      {sides.map((side, index) => (
        <div key={side.id} className={compact ? "flex items-center justify-between gap-3" : "flex items-center gap-3 rounded-card border border-arena-800 bg-arena-950/50 px-3 py-2"}>
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-5 shrink-0 font-mono text-[10px] uppercase text-ink-faint">{index + 1}</span>
            <span className={compact ? "truncate text-sm" : "truncate font-display text-lg uppercase"}>{sideLabel(side)}</span>
          </span>
          <span className={`${compact ? "text-sm" : "text-lg"} shrink-0 font-mono font-bold tabular-nums text-ink`}>{side.score}</span>
        </div>
      ))}
    </div>
  );
}
