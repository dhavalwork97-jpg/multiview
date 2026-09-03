import Link from "next/link";
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function slugifyGame(game: string) {
  return game.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function gameLabel(game: string) {
  return game.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function matchesGame(game: string, selected: string) {
  return slugifyGame(game) === selected || game.trim().toLowerCase() === selected;
}

function statusMatches(status: string, selected: string) {
  if (selected === "all") return true;
  if (selected === "upcoming") return status === "SCHEDULED";
  return status.toLowerCase() === selected;
}

function queryHref(game: string, status: string, q: string) {
  const params = new URLSearchParams();
  if (game !== "all") params.set("game", game);
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/tournaments?${query}` : "/tournaments";
}

export default async function TournamentsPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const selectedGame = firstParam(params.game)?.trim().toLowerCase() || "all";
  const selectedStatus = firstParam(params.status)?.trim().toLowerCase() || "all";
  const search = firstParam(params.q)?.trim() || "";

  const tournaments = await db.tournament.findMany({
    where: { status: { not: "DRAFT" }, publicEnabled: true },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: {
      id: true, name: true, game: true, sport: true, competitionType: true,
      scoringMode: true, status: true, startDate: true, venue: true,
      _count: { select: { brackets: true, stages: true } },
    },
  });

  const games = Array.from(new Set(tournaments.map((t) => t.game).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const gameFiltered = selectedGame === "all" ? tournaments : tournaments.filter((t) => matchesGame(t.game, selectedGame));
  const statusFiltered = gameFiltered.filter((t) => statusMatches(t.status, selectedStatus));
  const filtered = search
    ? statusFiltered.filter((t) => `${t.name} ${t.game} ${t.sport} ${t.venue ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    : statusFiltered;
  const live = filtered.filter((t) => t.status === "LIVE");
  const upcoming = filtered.filter((t) => t.status === "SCHEDULED");
  const completed = filtered.filter((t) => t.status !== "LIVE" && t.status !== "SCHEDULED");
  const selectedLabel = selectedGame === "all" ? "All games" : games.find((game) => matchesGame(game, selectedGame)) ?? gameLabel(selectedGame);

  const gameCounts = new Map<string, number>();
  const gameLiveCounts = new Map<string, number>();
  const gameUpcomingCounts = new Map<string, number>();
  for (const tournament of tournaments) {
    gameCounts.set(tournament.game, (gameCounts.get(tournament.game) ?? 0) + 1);
    if (tournament.status === "LIVE") gameLiveCounts.set(tournament.game, (gameLiveCounts.get(tournament.game) ?? 0) + 1);
    if (tournament.status === "SCHEDULED") gameUpcomingCounts.set(tournament.game, (gameUpcomingCounts.get(tournament.game) ?? 0) + 1);
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="mb-6 sm:mb-8">
          <p className="page-kicker">Competition hub</p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="page-title">Tournaments</h1>
              <p className="page-subtitle">Find live events, upcoming competitions, and results by game.</p>
            </div>
            {live.length > 0 && <span className="status-live self-start sm:self-auto"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />{live.length} live</span>}
          </div>
        </header>

        <section aria-label="Filter tournaments" className="surface-card mb-6 overflow-hidden p-2 sm:p-3">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="section-label">Browse competitions</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{filtered.length} shown · {tournaments.length} total</span>
          </div>
          <form action="/tournaments" className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input name="q" defaultValue={search} placeholder="Search tournament, game, venue…" aria-label="Search tournaments" className="min-h-10 flex-1 rounded-card border border-arena-700 bg-arena-950 px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-signal-live focus:ring-2 focus:ring-signal-live/20" />
            {selectedGame !== "all" && <input type="hidden" name="game" value={selectedGame} />}
            {selectedStatus !== "all" && <input type="hidden" name="status" value={selectedStatus} />}
            <button type="submit" className="action-primary min-h-10">Search</button>
          </form>
          <div className="mb-2 px-1.5 sm:px-2"><span className="section-label">Games</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={queryHref("all", selectedStatus, search)} className={`game-tab ${selectedGame === "all" ? "game-tab-active" : ""}`} aria-current={selectedGame === "all" ? "page" : undefined}>All <span className="ml-1 opacity-60">{tournaments.length}</span></Link>
            {games.map((game) => {
              const active = matchesGame(game, selectedGame);
              const liveCount = gameLiveCounts.get(game) ?? 0;
              const upcomingCount = gameUpcomingCounts.get(game) ?? 0;
              return <Link key={game} href={queryHref(slugifyGame(game), selectedStatus, search)} className={`game-tab ${active ? "game-tab-active" : ""}`} aria-current={active ? "page" : undefined}>
                <span>{game}</span><span className="ml-1 opacity-60">{gameCounts.get(game) ?? 0}</span>{liveCount > 0 && <span className="ml-1 inline-flex items-center gap-1 text-signal-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />{liveCount}</span>}{liveCount === 0 && upcomingCount > 0 && <span className="ml-1 text-ink-faint">· {upcomingCount} next</span>}
              </Link>;
            })}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Competition status">
            {[["all", "All"], ["live", "Live"], ["upcoming", "Upcoming"], ["completed", "Results"]].map(([value, label]) => (
              <Link key={value} href={queryHref(selectedGame, value, search)} className={`context-tab ${selectedStatus === value ? "context-tab-active" : ""}`} aria-current={selectedStatus === value ? "page" : undefined}>{label}</Link>
            ))}
          </div>
        </section>

        {selectedGame !== "all" && selectedStatus === "all" && search === "" && (
          <section className="surface-card mb-6 p-4 sm:p-5" aria-live="polite">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="section-label">{selectedLabel} status</p>
                {live.length > 0 ? (
                  <p className="mt-1 text-sm font-medium text-ink">{live.length} {live.length === 1 ? "tournament is" : "tournaments are"} live now.</p>
                ) : upcoming.length > 0 ? (
                  <p className="mt-1 text-sm font-medium text-ink">No live {selectedLabel} event right now · {upcoming.length} {upcoming.length === 1 ? "upcoming competition" : "upcoming competitions"}.</p>
                ) : (
                  <p className="mt-1 text-sm font-medium text-ink">No {selectedLabel} tournament is live or scheduled right now.</p>
                )}
              </div>
              <div className="flex gap-2">
                {live.length === 0 && upcoming.length > 0 && <Link href={queryHref(selectedGame, "upcoming", "")} className="action-primary">See upcoming</Link>}
                {live.length === 0 && upcoming.length === 0 && <Link href="/tournaments" className="action-secondary">Browse all games</Link>}
              </div>
            </div>
          </section>
        )}

        {tournaments.length === 0 ? (
          <div className="empty-state">
            <p className="page-kicker">No tournaments</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide">Nothing is scheduled yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Check back soon for the next public competition.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="page-kicker">No matches</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide">No {selectedLabel} competitions found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Try another game, status, or search term.</p>
            <Link href="/tournaments" className="action-secondary mt-5">Clear filters</Link>
          </div>
        ) : (
          <div className="space-y-8">
            {live.length > 0 && <TournamentSection title="Live now" tournaments={live} live />}
            {upcoming.length > 0 && <TournamentSection title={live.length > 0 ? "Upcoming" : "Upcoming competitions"} tournaments={upcoming} />}
            {completed.length > 0 && selectedStatus !== "live" && <TournamentSection title="Results & recent" tournaments={completed} />}
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
        <span className="section-label">{title}</span><span className="h-px flex-1 bg-arena-700" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map((t) => (
          <Link key={t.id} href={`/tournaments/${t.id}`} className="surface-card surface-card-interactive group block p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-signal-live">{t.game}</p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.sport} · {t.competitionType}</p>
              </div>
              <span className={`shrink-0 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[t.status] ?? "text-ink-muted"}`}>{live && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{t.status}</span>
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
