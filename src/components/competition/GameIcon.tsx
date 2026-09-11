import { getGameInitials, getGameVisual, normalizeGame } from "@/lib/competition/game-visuals";

export function GameIcon({ game, size = "md" }: { game: string; size?: "sm" | "md" }) {
  const normalized = normalizeGame(game);
  const visual = getGameVisual(game);
  const textSize = size === "sm" ? "text-[8px]" : "text-[9px]";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-arena-700 bg-arena-950 ${size === "sm" ? "h-7 w-7" : "h-9 w-9"}`}
      title={game}
      aria-hidden="true"
      data-game={normalized}
    >
      {visual.art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.art}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-110"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={`absolute inset-0 bg-gradient-to-br ${visual.accent}`} />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      {visual.domain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(visual.domain)}&sz=64`}
          alt=""
          width={64}
          height={64}
          className="relative z-10 h-5 w-5 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,.8)]"
          loading="lazy"
        />
      ) : (
        <span className="relative z-10 font-mono text-[9px] font-bold text-white drop-shadow">{getGameInitials(game)}</span>
      )}
      <span className={`sr-only ${textSize}`}>{game}</span>
    </span>
  );
}
