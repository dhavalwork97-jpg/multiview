import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BracketExplorer } from "@/components/bracket/BracketExplorer";
import { GameIcon } from "@/components/competition/GameIcon";
import { UniversalLiveViewer } from "@/components/competition/UniversalLiveViewer";
import { getCompetitionViewerState } from "@/lib/competition/get-viewer-state";

export async function generateMetadata({ params }: { params: Promise<{ tournamentId: string }> }): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { name: true, game: true, status: true } });
  if (!tournament) return { title: "Tournament" };
  return { title: `${tournament.name} · ${tournament.game}`, description: `${tournament.name} live tournament hub — watch individual matches, follow brackets, and track results.` };
}

function MatchCard({ match, live = false, result = false, tournamentId }: { match: { id: string; status: string; round: string | null; sides: Array<{ id: string; key: string; score: number; participants: Array<{ label: string }> }>; station: { id: string; label: string } | null }; live?: boolean; result?: boolean; tournamentId: string }) {
  return (
    <article className={`surface-card p-4 ${live ? "border-signal-live/40" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={live ? "status-live" : result ? "status-neutral" : "status-neutral"}>{live && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{live ? "LIVE" : result ? "Final" : "Next"}</span>
          {match.round && <span className="truncate font-mono text-[10px] uppercase tracking-widest text-ink-faint">{match.round}</span>}
        </div>
        {match.station && <span className="status-neutral">{match.station.label}</span>}
      </div>
      <div className="mt-4 space-y-2">
        {match.sides.map((side) => (
          <div key={side.id} className="flex items-center justify-between gap-3 rounded-card border border-arena-800 bg-arena-950/50 px-3 py-2">
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{side.participants.map((participant) => participant.label).join(" / ") || "TBD"}</span>
            <span className="font-mono text-lg font-bold tabular-nums text-ink">{side.score}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {live ? <Link href={`/watch/${match.id}`} className="action-primary">Watch live</Link> : <Link href={`/watch/${match.id}`} className="action-secondary">Match view</Link>}
        <Link href={`/multiview?tournamentId=${tournamentId}`} className="action-secondary">Multi-View</Link>
      </div>
    </article>
  );
}

export default async function TournamentPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true, name: true, slug: true, bestOf: true, format: true, publicEnabled: true, game: true, sport: true,
      participantMode: true, scoringMode: true, status: true, venue: true, startDate: true,
      organization: { select: { name: true, tagline: true, brandLogoUrl: true, brandPrimaryColor: true, brandAccentColor: true } },
      sponsors: { where: { active: true }, orderBy: { weight: "desc" }, take: 8 },
      teams: { include: { team: { select: { id: true, name: true, logoUrl: true } } }, orderBy: { seed: "asc" } },
      brackets: { select: { id: true, name: true } },
      stages: { orderBy: { orderIndex: "asc" }, select: { id: true, name: true, kind: true, status: true, _count: { select: { matches: true } } } },
    },
  });
  if (!tournament || !tournament.publicEnabled) notFound();

  const isBattleRoyale = tournament.sport === "bgmi" || tournament.scoringMode === "battle_royale";
  const viewerState = await getCompetitionViewerState(tournamentId);
  const isMultiStage = tournament.stages.length > 1 && !isBattleRoyale;
  if (!viewerState) notFound();

  const primaryLiveMatch = viewerState.live.matches.find((match) => match.id === viewerState.live.primaryMatchId) ?? viewerState.live.matches[0] ?? null;
  const nextMatch = viewerState.upcoming[0] ?? null;
  const recentResults = viewerState.recentResults.slice(0, 4);

  return (
    <main className="page-shell">
      <div className="page-container max-w-6xl">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <GameIcon game={tournament.game} />
                <div className="min-w-0"><p className="page-kicker text-signal-live">{tournament.game} · {tournament.sport}{tournament.venue ? ` · ${tournament.venue}` : ""}</p><h1 className="page-title mt-1">{tournament.name}</h1></div>
              </div>
              <p className="page-subtitle mt-2">{tournament.status} · {new Date(tournament.startDate).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tournament.status === "LIVE" && <span className="status-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />Live now</span>}
              <Link href="/tournaments" className="action-secondary">All tournaments</Link>
            </div>
          </div>
          <nav aria-label="Tournament navigation" className="context-tabs mt-5">
            <Link href={`/tournaments/${tournament.id}`} aria-current="page" className="context-tab context-tab-active">Overview</Link>
            <Link href={`/tournaments/${tournament.id}/standings`} className="context-tab">Standings</Link>
            {(primaryLiveMatch || tournament.status === "LIVE") && <Link href={`/multiview?tournamentId=${tournament.id}`} className="context-tab">Watch live</Link>}
          </nav>
        </header>

        <div className="space-y-6" style={{ ["--event-accent" as string]: tournament.organization.brandPrimaryColor ?? "#7cf7c5", ["--event-accent-2" as string]: tournament.organization.brandAccentColor ?? "#7c9cff" } as CSSProperties}>
          <section className="surface-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-4">
              {tournament.organization.brandLogoUrl && <img src={tournament.organization.brandLogoUrl} alt="" className="h-12 w-12 rounded-card object-cover" />}
              <div><p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--event-accent)" }}>{tournament.organization.name}</p><p className="text-sm text-ink-faint">{tournament.organization.tagline ?? "Official event broadcast hub"}</p></div>
            </div>
          </section>

          {(primaryLiveMatch || nextMatch) && (
            <section>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="section-label">What to watch</p><h2 className="page-title mt-1 text-2xl">{primaryLiveMatch ? "Live competition" : "Next match"}</h2><p className="page-subtitle">The fastest path from this tournament hub to the action.</p></div><Link href={`/multiview?tournamentId=${tournament.id}`} className="action-secondary self-start">Open Multi-View</Link></div>
              <div className="grid gap-4 md:grid-cols-2">
                {primaryLiveMatch && <MatchCard match={primaryLiveMatch} live tournamentId={tournament.id} />}
                {!primaryLiveMatch && nextMatch && <MatchCard match={nextMatch} tournamentId={tournament.id} />}
                {primaryLiveMatch && nextMatch && <MatchCard match={nextMatch} tournamentId={tournament.id} />}
              </div>
            </section>
          )}

          {tournament.sponsors.length > 0 && <section className="surface-card p-4"><p className="section-label">Presented by</p><div className="mt-3 flex flex-wrap gap-3">{tournament.sponsors.map((sponsor) => <a key={sponsor.id} href={sponsor.websiteUrl ?? "#"} target="_blank" rel="noreferrer" className="rounded-card border border-arena-700 px-4 py-2 transition-colors hover:border-signal-live">{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt={sponsor.name} className="h-8 max-w-28 object-contain" /> : sponsor.name}</a>)}</div></section>}

          {tournament.teams.length > 0 && <section><div className="mb-3"><p className="section-label">Competitors</p><h2 className="page-title mt-1 text-2xl">Teams</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tournament.teams.slice(0, 12).map(({ team }) => <Link key={team.id} href={`/teams/${team.id}`} className="surface-card surface-card-interactive p-4">{team.logoUrl && <img src={team.logoUrl} alt="" className="h-10 w-10 rounded object-cover" />}<p className="mt-2 font-display uppercase">{team.name}</p></Link>)}</div></section>}

          <section className="surface-card overflow-hidden p-2 sm:p-3"><UniversalLiveViewer tournamentId={tournament.id} initialState={viewerState} /></section>

          {recentResults.length > 0 && <section><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="section-label">Results</p><h2 className="page-title mt-1 text-2xl">Recent matches</h2><p className="page-subtitle">Catch up on the latest completed competition.</p></div><Link href={`/tournaments/${tournament.id}/standings`} className="action-secondary self-start">View standings</Link></div><div className="grid gap-4 md:grid-cols-2">{recentResults.map((match) => <MatchCard key={match.id} match={match} result tournamentId={tournament.id} />)}</div></section>}

          <section>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="section-label">Competition</p><h2 className="page-title mt-1 text-2xl">{isBattleRoyale ? "Battle Royale standings" : isMultiStage ? "Tournament stages" : "Brackets"}</h2>{isBattleRoyale ? <p className="page-subtitle">Placement, kills and points determine the leaderboard.</p> : isMultiStage ? <p className="page-subtitle">Groups qualify automatically into playoffs, then the Grand Final.</p> : null}</div>
              <Link href={`/tournaments/${tournament.id}/standings`} className="action-secondary self-start">Standings</Link>
            </div>

            {isBattleRoyale ? <div className="surface-card p-5"><p className="text-sm text-ink-muted">Battle Royale tournaments do not use a bracket. View the standings to follow placement, kills and total points.</p></div> : isMultiStage ? <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{tournament.stages.map((stage, index) => <div key={stage.id} className="surface-card p-4"><div className="flex items-center justify-between"><span className="section-label">Stage {index + 1}</span><span className="status-neutral">{stage.status}</span></div><h3 className="mt-2 font-display uppercase">{stage.name}</h3><p className="mt-1 text-xs text-ink-faint">{stage.kind} · {stage._count.matches} matches</p></div>)}</div> : <BracketExplorer brackets={tournament.brackets} tournamentId={tournament.id} />}
          </section>
        </div>
      </div>
    </main>
  );
}
