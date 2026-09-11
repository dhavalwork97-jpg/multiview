import { GameIcon } from "@/components/competition/GameIcon";
import { getGameVisual } from "@/lib/competition/game-visuals";

export function GameVisual({
  game,
  size = "md",
  className = "",
}: {
  game: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const visual = getGameVisual(game);
  const dimensions = size === "lg" ? "h-32 w-full sm:h-40" : size === "sm" ? "h-12 w-20" : "h-20 w-36";
  const iconSize = size === "sm" ? "sm" : "md";

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-arena-700 bg-arena-950 ${dimensions} ${className}`} aria-label={`${game} visual`}>
      {visual.art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.art}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-95"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${visual.accent}`} />
      )}
      <div className={`absolute inset-0 bg-gradient-to-br ${visual.accent}`} />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 to-transparent" />
      <div className="absolute inset-x-2 bottom-2 flex items-end gap-2">
        <GameIcon game={game} size={iconSize} />
        <span className="min-w-0 truncate font-display text-xs uppercase tracking-wide text-white drop-shadow sm:text-sm">{game}</span>
      </div>
    </div>
  );
}
