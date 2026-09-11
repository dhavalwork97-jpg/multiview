import { GameIcon } from "@/components/competition/GameIcon";

const GAME_ART: Record<string, string> = {
  "counter-strike 2": "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  "counter strike 2": "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  cs2: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  "dota 2": "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
  dota: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
  pubg: "https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg",
  "rocket league": "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg",
};

const GAME_ACCENTS: Record<string, string> = {
  valorant: "from-red-500/35 via-rose-500/10 to-transparent",
  "league of legends": "from-blue-500/35 via-cyan-500/10 to-transparent",
  league: "from-blue-500/35 via-cyan-500/10 to-transparent",
  "apex legends": "from-orange-500/35 via-red-500/10 to-transparent",
  apex: "from-orange-500/35 via-red-500/10 to-transparent",
  fortnite: "from-violet-500/35 via-fuchsia-500/10 to-transparent",
  "call of duty": "from-emerald-500/30 via-lime-500/10 to-transparent",
  cod: "from-emerald-500/30 via-lime-500/10 to-transparent",
  bgmi: "from-amber-500/35 via-orange-500/10 to-transparent",
  pubg: "from-amber-500/35 via-orange-500/10 to-transparent",
  "street fighter": "from-yellow-500/35 via-red-500/10 to-transparent",
  "street fighter 6": "from-yellow-500/35 via-red-500/10 to-transparent",
  tekken: "from-red-500/35 via-blue-500/10 to-transparent",
  "tekken 8": "from-red-500/35 via-blue-500/10 to-transparent",
  overwatch: "from-orange-400/30 via-yellow-400/10 to-transparent",
  "rainbow six siege": "from-blue-400/30 via-indigo-500/10 to-transparent",
  "rocket league": "from-cyan-400/30 via-blue-500/10 to-transparent",
};

function normalize(game: string) {
  return game.trim().toLowerCase().replace(/[®™]/g, "").replace(/\s+/g, " ");
}

function fallbackArt(game: string) {
  return `linear-gradient(135deg, rgba(124,92,255,.24), rgba(5,8,23,.96)), radial-gradient(circle at 85% 15%, rgba(0,207,255,.18), transparent 42%)`;
}

export function GameVisual({
  game,
  size = "md",
  className = "",
}: {
  game: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const key = normalize(game);
  const art = GAME_ART[key];
  const accent = GAME_ACCENTS[key] ?? "from-violet-500/30 via-cyan-500/10 to-transparent";
  const dimensions = size === "lg" ? "h-28 w-full" : size === "sm" ? "h-12 w-20" : "h-20 w-36";
  const iconSize = size === "sm" ? "sm" : "md";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-arena-700 bg-arena-950 ${dimensions} ${className}`}
      aria-label={`${game} visual`}
    >
      {art ? (
        <img
          src={art}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-95"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundImage: fallbackArt(game) }} />
      )}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute inset-x-2 bottom-2 flex items-end gap-2">
        <GameIcon game={game} size={iconSize} />
        <span className="min-w-0 truncate font-display text-xs uppercase tracking-wide text-white drop-shadow sm:text-sm">
          {game}
        </span>
      </div>
    </div>
  );
}
