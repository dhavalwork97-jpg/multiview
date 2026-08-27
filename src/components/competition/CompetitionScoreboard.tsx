import type { ViewerSide } from "@/lib/competition/viewer-state";

export function CompetitionScoreboard({
  sides,
  compact = false,
}: {
  sides: ViewerSide[];
  compact?: boolean;
}) {
  if (sides.length === 0) return null;

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2"
          : "grid grid-cols-[1fr_auto_1fr] items-center gap-4"
      }
    >
      {sides.map((side, index) => (
        <div
          key={side.id}
          className={
            compact
              ? "flex items-center gap-2"
              : index === 0
                ? "min-w-0 text-left"
                : "min-w-0 text-right"
          }
        >
          <span
            className={
              compact
                ? "truncate text-sm"
                : "block truncate font-display text-lg uppercase"
            }
          >
            {side.participants.map((participant) => participant.label).join(" / ")}
          </span>

          <span className="font-mono text-lg">{side.score}</span>

          {index < sides.length - 1 && compact && (
            <span className="text-ink-faint">·</span>
          )}
        </div>
      ))}
    </div>
  );
}