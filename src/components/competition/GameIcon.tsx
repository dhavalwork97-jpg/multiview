const GAME_ICON_DOMAINS: Record<string, string> = {
  "apex legends": "ea.com",
  apex: "ea.com",
  "call of duty": "callofduty.com",
  cod: "callofduty.com",
  "counter-strike 2": "counter-strike.net",
  "counter strike 2": "counter-strike.net",
  cs2: "counter-strike.net",
  "dota 2": "dota2.com",
  dota: "dota2.com",
  fortnite: "fortnite.com",
  "league of legends": "leagueoflegends.com",
  league: "leagueoflegends.com",
  "mortal kombat": "mortalkombat.com",
  overwatch: "overwatch.blizzard.com",
  pubg: "pubg.com",
  bgmi: "battlegroundsmobileindia.com",
  "street fighter": "streetfighter.com",
  "street fighter 6": "streetfighter.com",
  tekken: "tekken.com",
  "tekken 8": "tekken.com",
  valorant: "playvalorant.com",
  "rainbow six siege": "ubisoft.com",
  "rainbow six": "ubisoft.com",
  "rocket league": "rocketleague.com",
  "super smash bros": "smashbros.com",
};

const GAME_ART: Record<string, string> = {
  "counter-strike 2": "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  "counter strike 2": "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  cs2: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  "dota 2": "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
  dota: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
  pubg: "https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg",
  "rocket league": "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg",
};

function normalizeGame(game: string) {
  return game.trim().toLowerCase().replace(/[®™]/g, "").replace(/\s+/g, " ");
}

function initials(game: string) {
  const words = game.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function GameArt({ game, normalized }: { game: string; normalized: string }) {
  const art = GAME_ART[normalized];
  const domain = GAME_ICON_DOMAINS[normalized];

  return (
    <>
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-75"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,207,255,.22),transparent_45%),linear-gradient(135deg,rgba(124,92,255,.30),rgba(5,8,23,.98))]" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      {domain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt=""
          width={64}
          height={64}
          className="relative z-10 h-5 w-5 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,.8)]"
          loading="lazy"
        />
      ) : (
        <span className="relative z-10 font-mono text-[9px] font-bold text-white drop-shadow">{initials(game)}</span>
      )}
    </>
  );
}

export function GameIcon({ game, size = "md" }: { game: string; size?: "sm" | "md" }) {
  const normalized = normalizeGame(game);
  const textSize = size === "sm" ? "text-[8px]" : "text-[9px]";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-arena-700 bg-arena-950 ${size === "sm" ? "h-7 w-7" : "h-9 w-9"}`}
      title={game}
      aria-hidden="true"
    >
      <GameArt game={game} normalized={normalized} />
      <span className={`sr-only ${textSize}`}>{game}</span>
    </span>
  );
}
