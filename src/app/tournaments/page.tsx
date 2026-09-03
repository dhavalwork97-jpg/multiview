import Link from "next/link";
import { GameIcon } from "@/components/competition/GameIcon";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ game?: string | string[]; status?: string | string[]; q?: string | string[] }>;
};

const STATUS_STYLE: Record<string, string> = {
  LIVE: "text-signal-live",
  SCHEDULED: "text-ink-muted",
  COMPLETED: "text-ink-faint",
  ARCHIVED: "text-ink-faint",
  DRAFT: "text-ink-faint",
};

function slugifyGame(game: string) {
  return game.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function matchesGame(game: string, selected: string) {
  return slugifyGame(game) === selected || game.trim().toLowerCase() === selected;
}

function matchesSearch(tournament: { name: string; game: string; venue: string | null }, query: string) {
  if (!query) return true;
  const haystack = `${tournament.name} ${tournament.game} ${tournament.venue ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

export default async function TournamentsPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const rawGame = Array.isArray(params.game) ? params.game[0] : params.game;
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const selectedGame = rawGame?.trim().toLowerCase() || "all";
  const selectedStatus = ["live", "upcoming", "completed"].includes(rawStatus?.trim().toLowerCase() ?? "")
    ? rawStatus!.trim().toLowerCase()
    : "all";
  const query = rawQuery?.trim().toLowerCase() ?? "";

  const tournaments = await db.tournament.findMany({
    where: {
      status: { not: "DRAFT" },
      publicEnabled: true,
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: {
      id: true,
      name: true,
      game: true,
      sport: true,
      competitionType: true,
      scoringMode: true,
      status: true,
      startDate: true,
      venue: true,
      _count: { select: { brackets: true, stages: true } },
    },
  });

  const games = Array.from(new Set(tournaments.map((t) => t.game).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const filtered = tournaments.filter((t) => {
    const gameMatches = selectedGame === "all" || matchesGame(t.game, selectedGame);
    const statusMatches =
      selectedStatus === "all" ||
      (selectedStatus === "live" && t.status === "LIVE") ||
      (selectedStatus === "upcoming" && t.status === "SCHEDULED") ||
      (selectedStatus === "completed" && t.status === "COMPLETED");
    return gameMatches && statusMatches && matchesSearch(t, query);
  });

  const live = filtered.filter((t) => t.status === "LIVE");
  const upcoming = filtered.filter((t) => t.status === "SCHEDULED");
  const completed = filtered.filter((t) => t.status === "COMPLETED");
  const hasFilters = selectedGame !== "all" || selectedStatus !== "all" || query.length > 0;

  function filterHref(overrides: { game?: string; status?: string; q?: string }) {
    const nextGame = overrides.game ?? selectedGame;
    const nextStatus = overrides.status ?? selectedStatus;
    const nextQuery = overrides.q ?? query;
    const search = new URLSearchParams();
    if (nextGame !== "all") search.set("game", nextGame);
    if (nextStatus !== "all") search.set("status", nextStatus);
    if (nextQuery) search.set("q", nextQuery);
    const value = search.toString();
    return value ? `/tournaments?${value}` : "/tournaments";
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="mb-6 sm:mb-8">
          <p className="page-kicker">Competition hub</p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="page-title">Tournaments</h1>
              <p className="page-subtitle">Find live, upcoming and completed fighting game competitions.</p>
            </div>
            {live.length > 0 && <span className="status-live self-start sm:self-auto"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />{live.length} live</span>}
          </div>
        </header>

        <section aria-label="Find tournaments" className="surface-card mb-6 space-y-3 overflow-hidden p-3 sm:p-4">
          <form action="/tournaments" className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="tournament-search" className="sr-only">Search tournaments</label>
            <input
              id="tournament-search"
              name="q"
              defaultValue={rawQuery ?? ""}
              placeholder="Search tournament, game or venue"
              className="min-h-11 min-w-0 flex-1 rounded-card border border-arena-700 bg-arena-950 px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-signal-live"
            />
            {selectedGame !== "all" && <input type="hidden" name="game" value={selectedGame} />}
            {selectedStatus !== "all" && <input type="hidden" name="status" value={selectedStatus} />}
            <button type="submit" className="action-primary min-h-11 px-5">Search</button>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Competition status">
            {[{ key: "all", label: "All" }, { key: "live", label: "Live" }, { key: "upcoming", label: "Upcoming" }, { key: "completed", label: "Completed" }].map((item) => (
              <Link key={item.key} href={filterHref({ status: item.key })} className={`game-tab ${selectedStatus === item.key ? "game-tab-active" : ""}`} aria-current={selectedStatus === item.key ? "page" : undefined}>{item.label}</Link>
            ))}
          </div>

          <div className="border-t border-arena-700 pt-3">
            <div className="mb-2 px-1.5"><span className="section-label">Games</span></div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link href={filterHref({ game: "all" })} className={`game-tab ${selectedGame === "all" ? "game-tab-active" : ""}`} aria-current={selectedGame === "all" ? "page" : undefined}>All</Link>
              {games.map((game) => {
                const active = matchesGame(game, selectedGame);
                return (
                  <Link key={game} href={filterHref({ game: slugifyGame(game) })} className={`game-tab inline-flex items-center gap-1.5 ${active ? "game-tab-active" : ""}`} aria-current={active ? "page" : undefined}>
                    <GameIcon game={game} size="sm" />
                    <span>{game}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {tournaments.length === 0 ? (
          <div className="empty-state">
            <p className="page-kicker">No tournaments</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide">Nothing is scheduled yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Check back soon for the next public competition.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="page-kicker">No matches</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide">No tournaments match these filters</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Try a different game, status or search term.</p>
            {hasFilters && <Link href="/tournaments" className="action-secondary mt-5">Clear filters</Link>}
          </div>
        ) : (
          <div className="space-y-8">
            {live.length > 0 && <TournamentSection title="Live now" tournaments={live} live />}
            {upcoming.length > 0 && <TournamentSection title="Upcoming" tournaments={upcoming} />}
            {completed.length > 0 && <TournamentSection title="Completed" tournaments={completed} />}
          </div>
        )}
      </div>
    </main>
  );
}

function TournamentSection({ title, tournaments, live = false }: { title: string; tournaments: Array<{ id: string; name: string; game: string; sport: string; competitionType: string; scoringMode: string; status: string; startDate: Date; venue: string | null; _count: { brackets: number; stages: number } }>; live?: boolean }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="section-label">{title}</span>
        <span className="h-px flex-1 bg-arena-700" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map((t) => (
          <Link key={t.id} href={`/tournaments/${t.id}`} className="surface-card surface-card-interactive group block p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <GameIcon game={t.game} />
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-signal-live">{t.game}</p>
                  <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.sport} · {t.competitionType}</p>
                </div>
              </div>
              <span className={`shrink-0 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[t.status] ?? "text-ink-muted"}`}>
                {live && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{t.status}
              </span>
            </div>
            <h2 className="mt-4 font-display text-2xl uppercase tracking-wide text-ink group-hover:text-signal-live">{t.name}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-arena-700 pt-3 text-xs text-ink-faint">
              <div><span className="block font-mono text-[9px] uppercase tracking-widest text-ink-faint">When</span><span className="text-ink-muted">{new Date(t.startDate).toLocaleDateString()}</span></div>
              <div><span className="block font-mono text-[9px] uppercase tracking-widest text-ink-faint">Where</span><span className="truncate text-ink-muted">{t.venue ?? "Online"}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.scoringMode === "battle_royale" || t.sport === "bgmi" ? "Battle Royale · standings" : t._count.brackets > 0 ? `${t._count.brackets} bracket${t._count.brackets === 1 ? "" : "s"}` : "Bracket pending"}</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted transition-colors group-hover:text-signal-live">View →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
