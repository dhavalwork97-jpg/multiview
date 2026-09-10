import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { GameIcon } from "@/components/competition/GameIcon";
import { TournamentCommandCenter } from "@/components/competition/TournamentCommandCenter";
import { UniversalLiveViewer } from "@/components/competition/UniversalLiveViewer";
import { CompetitionScoreboard } from "@/components/competition/CompetitionScoreboard";
import { getCompetitionViewerState } from "@/lib/competition/get-viewer-state";

export async function generateMetadata({ params }: { params: Promise<{ tournamentId: string }> }): Promise<Metadata> {
  const { tournamentId } = await params;
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: { name: true, game: true } });
  return t ? { title: `${t.name} · ${t.game}`, description: `${t.name} tournament hub` } : { title: "Tournament" };
}

function MatchCard({ match, live, tournamentId }: { match: any; live?: boolean; tournamentId: string }) {
  return <article className={`surface-card group overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/40 ${live ? "border-signal-live/40 shadow-[0_0_32px_rgba(0,207,255,.10)]" : ""}`}>
    <div className="flex items-center justify-between gap-3"><span className={live ? "status-live" : "status-neutral"}>{live && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{live ? "LIVE NOW" : "UP NEXT"}</span>{match.round && <span className="font-mono text-[10px] uppercase tracking-[.18em] text-ink-faint">{match.round}</span>}</div>
    <div className="mt-4"><CompetitionScoreboard sides={match.sides} /></div>
    <div className="mt-4 flex gap-2"><Link href={`/watch/${match.id}`} className="action-primary">{live ? "Watch live" : "Match view"}</Link><Link href={`/multiview?tournamentId=${tournamentId}`} className="action-secondary">Multi-View</Link></div>
  </article>;
}

export default async function TournamentPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: {
    id:true,name:true,game:true,sport:true,status:true,venue:true,startDate:true,format:true,participantMode:true,publicEnabled:true,
    _count:{select:{entrants:true,teams:true,matches:true,stages:true}},
    organization:{select:{name:true,tagline:true,brandLogoUrl:true,brandPrimaryColor:true,brandAccentColor:true}},
    teams:{include:{team:{select:{id:true,name:true,logoUrl:true}}},orderBy:{seed:"asc"},take:12},
    entrants:{orderBy:{seed:"asc"},take:12,select:{id:true,seed:true,eliminated:true,player:{select:{id:true,gamertag:true,avatarUrl:true,country:true}}}}
  }});
  if (!t || !t.publicEnabled) notFound();
  const state = await getCompetitionViewerState(tournamentId); if (!state) notFound();
  const live = state.live.matches.find((m:any)=>m.id===state.live.primaryMatchId) ?? state.live.matches[0] ?? null;
  const next = state.upcoming[0] ?? null;
  const teamMode = t.participantMode === "team";
  const count = teamMode ? t._count.teams : t._count.entrants;
  return <main className="page-shell">
    <div className="page-container max-w-6xl" style={{"--event-accent":t.organization.brandPrimaryColor ?? "#7c5cff","--event-accent-2":t.organization.brandAccentColor ?? "#00cfff"} as React.CSSProperties}>
      <header className="relative overflow-hidden rounded-[24px] border border-violet-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(124,92,255,.24),transparent_34%),linear-gradient(135deg,rgba(10,18,48,.98),rgba(4,8,22,.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,.28)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-3"><GameIcon game={t.game}/><div><p className="page-kicker text-cyan-300">{t.game} · {t.sport}{t.venue ? ` · ${t.venue}` : ""}</p><h1 className="page-title mt-1 text-3xl sm:text-5xl">{t.name}</h1><p className="page-subtitle mt-2">{t.status} · {new Date(t.startDate).toLocaleDateString()}</p></div></div></div><div className="flex flex-wrap gap-2">{t.status === "LIVE" && <span className="status-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse"/>Live now</span>}<Link href="/tournaments" className="action-secondary">All tournaments</Link></div></div>
        <nav aria-label="Tournament navigation" className="context-tabs relative mt-7"><Link href={`/tournaments/${t.id}`} className="context-tab context-tab-active">Overview</Link><Link href={`/tournaments/${t.id}/standings`} className="context-tab">Standings</Link>{live && <Link href={`/watch/${live.id}`} className="context-tab">Watch live</Link>}</nav>
      </header>

      <div className="mt-6 space-y-7">
        <TournamentCommandCenter tournamentId={t.id} status={t.status} participantCount={count} matchCount={t._count.matches} stageCount={t._count.stages} liveMatch={live} nextMatch={next}/>

        <section className="grid gap-3 sm:grid-cols-4"><div className="surface-card p-4"><span className="section-label">Prize / format</span><strong className="mt-2 block font-display text-xl">{t.format ?? "Standard"}</strong></div><div className="surface-card p-4"><span className="section-label">Participants</span><strong className="mt-2 block font-display text-xl">{count}</strong></div><div className="surface-card p-4"><span className="section-label">Matches</span><strong className="mt-2 block font-display text-xl">{t._count.matches}</strong></div><div className="surface-card p-4"><span className="section-label">Stages</span><strong className="mt-2 block font-display text-xl">{t._count.stages}</strong></div></section>

        {(live || next) && <section><div className="mb-4"><p className="section-label">02 · What to watch</p><h2 className="page-title mt-1 text-2xl sm:text-3xl">Follow the competition</h2><p className="page-subtitle">Jump from the tournament hub directly into the action.</p></div><div className="grid gap-4 md:grid-cols-2">{live && <MatchCard match={live} live tournamentId={t.id}/>} {next && <MatchCard match={next} tournamentId={t.id}/>}</div></section>}

        <section><div className="mb-4"><p className="section-label">03 · Competitors</p><h2 className="page-title mt-1 text-2xl sm:text-3xl">{teamMode ? "Teams" : "Entrants"}</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{teamMode ? t.teams.map(({team,seed})=><Link key={team.id} href={`/teams/${team.id}`} className="surface-card surface-card-interactive p-4"><div className="flex items-center gap-3">{team.logoUrl?<img src={team.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-arena-800 font-display text-lg">{team.name[0]}</span>}<div><p className="font-display uppercase">{team.name}</p><p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Seed {seed ?? "—"}</p></div></div></Link>) : t.entrants.map(e=><div key={e.id} className="surface-card p-4"><div className="flex items-center gap-3">{e.player.avatarUrl?<img src={e.player.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-full bg-arena-800 font-display text-lg">{e.player.gamertag[0]}</span>}<div><p className="font-display uppercase">{e.player.gamertag}</p><p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Seed {e.seed ?? "—"}</p></div></div></div>)}</div></section>

        <section className="surface-card overflow-hidden p-2 sm:p-3"><UniversalLiveViewer tournamentId={t.id} initialState={state}/></section>
      </div>
    </div>
  </main>;
}
