import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BracketExplorer } from "@/components/bracket/BracketExplorer";
import { GameIcon } from "@/components/competition/GameIcon";
import { TournamentCommandCenter } from "@/components/competition/TournamentCommandCenter";
import { UniversalLiveViewer } from "@/components/competition/UniversalLiveViewer";
import { CompetitionScoreboard } from "@/components/competition/CompetitionScoreboard";
import { getCompetitionViewerState } from "@/lib/competition/get-viewer-state";

export async function generateMetadata({ params }: { params: Promise<{ tournamentId: string }> }): Promise<Metadata> {
  const { tournamentId } = await params;
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: { name: true, game: true } });
  return t ? { title: `${t.name} · ${t.game}`, description: `${t.name} live tournament hub` } : { title: "Tournament" };
}

type Match = { id: string; status: string; round: string | null; sides: Array<{ id: string; key: string; score: number; participants: Array<{ label: string }> }>; station: { id: string; label: string } | null };

function MatchCard({ match, live = false, result = false, tournamentId }: { match: Match; live?: boolean; result?: boolean; tournamentId: string }) {
  return <article className={`surface-card group overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/40 ${live ? "border-signal-live/40 shadow-[0_0_32px_rgba(0,207,255,.10)]" : ""}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2"><span className={live ? "status-live" : "status-neutral"}>{live && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{live ? "LIVE NOW" : result ? "FINAL" : "UP NEXT"}</span>{match.round && <span className="truncate font-mono text-[10px] uppercase tracking-[.18em] text-ink-faint">{match.round}</span>}</div>
      {match.station && <span className="status-neutral">{match.station.label}</span>}
    </div>
    <div className="mt-4"><CompetitionScoreboard sides={match.sides} /></div>
    <div className="mt-4 flex flex-wrap gap-2"><Link href={`/watch/${match.id}`} className={live ? "action-primary" : "action-secondary"}>{live ? "Watch live" : result ? "Match view" : "Match view"}</Link><Link href={`/multiview?tournamentId=${tournamentId}`} className="action-secondary">Multi-View</Link></div>
  </article>;
}

export default async function TournamentPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: {
    id: true, name: true, game: true, sport: true, status: true, venue: true, startDate: true, format: true, participantMode: true, scoringMode: true, publicEnabled: true,
    _count: { select: { entrants: true, teams: true, matches: true, brackets: true, stages: true } },
    organization: { select: { name: true, tagline: true, brandLogoUrl: true, brandPrimaryColor: true, brandAccentColor: true } },
    sponsors: { where: { active: true }, orderBy: { weight: "desc" }, take: 8 },
    brackets: { select: { id: true, name: true } },
    stages: { orderBy: { orderIndex: "asc" }, select: { id: true, name: true, kind: true, status: true, _count: { select: { matches: true } } } },
    teams: { include: { team: { select: { id: true, name: true, logoUrl: true } } }, orderBy: { seed: "asc" }, take: 12 },
    entrants: { orderBy: { seed: "asc" }, take: 12, select: { id: true, seed: true, eliminated: true, player: { select: { id: true, gamertag: true, avatarUrl: true, country: true } } } }
  }});
  if (!t || !t.publicEnabled) notFound();
  const state = await getCompetitionViewerState(tournamentId); if (!state) notFound();
  const live = state.live.matches.find((m) => m.id === state.live.primaryMatchId) ?? state.live.matches[0] ?? null;
  const next = state.upcoming[0] ?? null;
  const recent = state.recentResults.slice(0, 4) as Match[];
  const teamMode = t.participantMode === "team";
  const battleRoyale = t.sport === "bgmi" || t.scoringMode === "battle_royale";
  const multiStage = t.stages.length > 1 && !battleRoyale;
  const count = teamMode ? t._count.teams : t._count.entrants;

  return <main className="page-shell"><div className="page-container max-w-6xl" style={{ "--event-accent": t.organization.brandPrimaryColor ?? "#7c5cff", "--event-accent-2": t.organization.brandAccentColor ?? "#00cfff" } as CSSProperties}>
    <header className="relative overflow-hidden rounded-[24px] border border-violet-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(124,92,255,.24),transparent_34%),linear-gradient(135deg,rgba(10,18,48,.98),rgba(4,8,22,.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,.28)] sm:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-3"><GameIcon game={t.game}/><div><p className="page-kicker text-cyan-300">{t.game} · {t.sport}{t.venue ? ` · ${t.venue}` : ""}</p><h1 className="page-title mt-1 text-3xl sm:text-5xl">{t.name}</h1><p className="page-subtitle mt-2">{t.status} · {new Date(t.startDate).toLocaleDateString()}</p></div></div></div><div className="flex flex-wrap gap-2">{t.status === "LIVE" && <span className="status-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse"/>Live now</span>}<Link href="/tournaments" className="action-secondary">All tournaments</Link></div></div>
      <nav aria-label="Tournament navigation" className="context-tabs relative mt-7"><Link href={`/tournaments/${t.id}`} className="context-tab context-tab-active">Overview</Link><Link href={`/tournaments/${t.id}/standings`} className="context-tab">Standings</Link>{(live || t.status === "LIVE") && <Link href={`/multiview?tournamentId=${t.id}`} className="context-tab">Watch live</Link>}</nav>
    </header>

    <div className="mt-6 space-y-7">
      <TournamentCommandCenter tournamentId={t.id} status={t.status} participantCount={count} matchCount={t._count.matches} stageCount={t._count.stages} liveMatch={live} nextMatch={next}/>

      <section className="surface-card p-4 sm:p-5"><div className="flex flex-wrap items-center gap-4">{t.organization.brandLogoUrl && <img src={t.organization.brandLogoUrl} alt="" className="h-12 w-12 rounded-card object-cover"/>}<div><p className="font-mono text-[10px] uppercase tracking-widest" style={{color:"var(--event-accent)"}}>{t.organization.name}</p><p className="text-sm text-ink-faint">{t.organization.tagline ?? "Official event broadcast hub"}</p></div></div><div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-arena-700 bg-arena-700 sm:grid-cols-4">{[["Format",t.format ?? "Standard"],["Participants",String(count)],["Matches",String(t._count.matches)],["Stages",String(t._count.stages)]].map(([label,value])=><div key={label} className="min-w-0 bg-arena-950/70 px-3 py-2.5"><span className="block font-mono text-[9px] uppercase tracking-widest text-ink-faint">{label}</span><span className="mt-1 block truncate text-sm text-ink-muted">{value}</span></div>)}</div></section>

      {(live || next) && <section><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="section-label">02 · What to watch</p><h2 className="page-title mt-1 text-2xl sm:text-3xl">{live ? "Live competition" : "Next match"}</h2><p className="page-subtitle">The fastest path from this tournament hub to the action.</p></div><Link href={`/multiview?tournamentId=${t.id}`} className="action-secondary self-start">Open Multi-View</Link></div><div className="grid gap-4 md:grid-cols-2">{live && <MatchCard match={live as Match} live tournamentId={t.id}/>} {next && <MatchCard match={next as Match} tournamentId={t.id}/>}</div></section>}

      {t.sponsors.length > 0 && <section className="surface-card p-4"><p className="section-label">Presented by</p><div className="mt-3 flex flex-wrap gap-3">{t.sponsors.map((s) => <a key={s.id} href={s.websiteUrl ?? "#"} target="_blank" rel="noreferrer" className="rounded-card border border-arena-700 px-4 py-2 transition-colors hover:border-signal-live">{s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="h-8 max-w-28 object-contain"/> : s.name}</a>)}</div></section>}

      <section><div className="mb-4 flex items-end justify-between gap-3"><div><p className="section-label">03 · Competitors</p><h2 className="page-title mt-1 text-2xl sm:text-3xl">{teamMode ? "Teams" : "Entrants"}</h2><p className="page-subtitle">Follow the field and track who remains in contention.</p></div><span className="status-neutral">{count} registered</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{teamMode ? t.teams.map(({team,seed})=><Link key={team.id} href={`/teams/${team.id}`} className="surface-card surface-card-interactive p-4"><div className="flex items-center gap-3">{team.logoUrl?<img src={team.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-arena-800 font-display text-lg">{team.name[0]}</span>}<div><p className="font-display uppercase">{team.name}</p><p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Seed {seed ?? "—"}</p></div></div></Link>) : t.entrants.map(e=><div key={e.id} className="surface-card p-4"><div className="flex items-center gap-3">{e.player.avatarUrl?<img src={e.player.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-full bg-arena-800 font-display text-lg">{e.player.gamertag[0]}</span>}<div><p className="font-display uppercase">{e.player.gamertag}</p><p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Seed {e.seed ?? "—"}</p></div></div></div>)}</div></section>

      <section className="surface-card overflow-hidden p-2 sm:p-3"><UniversalLiveViewer tournamentId={t.id} initialState={state}/></section>

      {recent.length > 0 && <section><div className="mb-4 flex items-end justify-between gap-3"><div><p className="section-label">04 · Results</p><h2 className="page-title mt-1 text-2xl sm:text-3xl">Recent matches</h2><p className="page-subtitle">Catch up on the latest completed competition.</p></div><Link href={`/tournaments/${t.id}/standings`} className="action-secondary">View standings</Link></div><div className="grid gap-4 md:grid-cols-2">{recent.map(m=><MatchCard key={m.id} match={m} result tournamentId={t.id}/>)}</div></section>}

      <section><div className="mb-4 flex items-end justify-between gap-3"><div><p className="section-label">05 · Competition</p><h2 className="page-title mt-1 text-2xl sm:text-3xl">{battleRoyale ? "Battle Royale standings" : multiStage ? "Tournament stages" : "Brackets"}</h2><p className="page-subtitle">{battleRoyale ? "Placement, kills and points determine the leaderboard." : multiStage ? "Groups, playoffs and finals stay visible in one competition flow." : "Follow the bracket and progression of every match."}</p></div><Link href={`/tournaments/${t.id}/standings`} className="action-secondary">Standings</Link></div>
        {battleRoyale ? <div className="surface-card p-5"><p className="text-sm text-ink-muted">Battle Royale tournaments do not use a bracket. View standings for placement, kills and total points.</p></div> : multiStage ? <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{t.stages.map((s,i)=><div key={s.id} className="surface-card p-4"><div className="flex items-center justify-between"><span className="section-label">Stage {i+1}</span><span className="status-neutral">{s.status}</span></div><p className="mt-2 font-display text-xl uppercase">{s.name}</p><p className="mt-1 text-xs text-ink-faint">{s.kind} · {s._count.matches} matches</p></div>)}</div> : t.brackets.length > 0 ? <div className="surface-card overflow-hidden p-3"><BracketExplorer tournamentId={t.id}/></div> : <div className="surface-card p-5"><p className="text-sm text-ink-muted">The bracket will appear here once the organizer creates the competition bracket.</p></div>}
      </section>
    </div>
  </div></main>;
}
