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

function normalizeGame(game: string) {
  return game.trim().toLowerCase().replace(/[®™]/g, "").replace(/\s+/g, " ");
}

function initials(game: string) {
  const words = game.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export function GameIcon({ game, size = "md" }: { game: string; size?: "sm" | "md" }) {
  const normalized = normalizeGame(game);
  const domain = GAME_ICON_DOMAINS[normalized];
  const pixels = size === "sm" ? 28 : 36;
  const textSize = size === "sm" ? "text-[8px]" : "text-[9px]";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-arena-700 bg-arena-950 ${size === "sm" ? "h-7 w-7" : "h-9 w-9"}`}
      title={game}
      aria-hidden="true"
    >
      {domain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${pixels}`}
          alt=""
          width={pixels}
          height={pixels}
          className={`${size === "sm" ? "h-4 w-4" : "h-5 w-5"} object-contain`}
          loading="lazy"
        />
      ) : (
        <span className={`font-mono font-bold tracking-tight text-ink-muted ${textSize}`}>{initials(game)}</span>
      )}
    </span>
  );
}
