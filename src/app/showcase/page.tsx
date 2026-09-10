import Link from "next/link";
import { db } from "@/lib/db";
import { GameIcon } from "@/components/competition/GameIcon";
import { LiveBadge } from "@/components/ui/LiveBadge";

export default async function ShowcasePage() {
  const tournaments = await db.tournament.findMany({
    where: { publicEnabled: true, status: { in: ["LIVE", "SCHEDULED"] } },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
    take: 8,
    select: {
      id: true, name: true, game: true, sport: true, status: true, startDate: true, venue: true,
      format: true, scoringMode: true, participantMode: true,
      organization: { select: { name: true, tagline: true, brandLogoUrl: true, brandPrimaryColor: true, brandAccentColor: true } },
      _count: { select: { matches: true, teams: true, entrants: true, stages: true } },
      sponsors: { where: { active: true }, orderBy: { weight: "desc" }, take: 4, select: { id: true, name: true, logoUrl: true } },
    },
  });

  const live = tournaments.find((t) => t.status === "LIVE") ?? tournaments[0] ?? null;
  const liveCount = tournaments.filter((t) => t.status === "LIVE").length;
  const scheduledCount = tournaments.filter((t) => t.status === "SCHEDULED").length;
  const featured = live ? tournaments.filter((t) => t.id !== live.id).slice(0, 6) : tournaments.slice(0, 6);
  const participantCount = live ? live._count.teams + live._count.entrants : 0;

  return (
    <main className="page-shell overflow-hidden">
      <div className="page-container max-w-7xl">
        <section className="relative overflow-hidden rounded-shell border border-arena-600 bg-arena-950 shadow-[0_35px_120px_rgba(0,0,0,.5)]">
          <div className="pointer-events-none absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-corner-p2/[.14] blur-[120px]" />
          <div className="pointer-events-none absolute -right-24 top-10 h-[28rem] w-[28rem] rounded-full bg-signal-live/[.08] blur-[110px]" />
          <div className="relative grid lg:grid-cols-[1.2fr_.8fr]">
            <div className="p-6 sm:p-9 lg:p-12">
              <div className="flex flex-wrap items-center gap-2">
                <span className="status-live"><span className="live-dot animate-live-pulse" /> Championship weekend</span>
                <span className="status-neutral">FGC / SHOWCASE</span>
              </div>
              <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[.28em] text-corner-p2">The complete competition experience</p>
              <h1 className="mt-4 display-hero">FGC<br /><span className="text-ink-muted">SHOWCASE.</span></h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">A live championship surface connecting competition, standings, teams, players, broadcast moments and sponsor identity — without leaving the viewer experience.</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {live && <Link href={`/tournaments/${live.id}`} className="action-primary min-h-12 bg-corner-p2 px-6 text-ink shadow-violet">Enter live championship <span aria-hidden>→</span></Link>}
                <Link href="/tournaments" className="action-secondary min-h-12 px-6">Explore all tournaments</Link>
                <Link href="/multiview" className="action-ghost min-h-12">Open multi-view</Link>
              </div>
            </div>
            <aside className="border-t border-arena-700 bg-[radial-gradient(circle_at_50%_35%,rgba(108,99,255,.18),transparent_40%),linear-gradient(160deg,rgba(21,23,34,.88),rgba(7,7,11,.98))] p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
              <p className="metric-label">Broadcast snapshot</p>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-arena-700 bg-arena-700">
                <div className="bg-arena-950/80 p-4"><p className="metric-label">Live</p><p className="mt-1 font-display text-4xl text-signal-live">{String(liveCount).padStart(2, "0")}</p></div>
                <div className="bg-arena-950/80 p-4"><p className="metric-label">Upcoming</p><p className="mt-1 font-display text-4xl">{String(scheduledCount).padStart(2, "0")}</p></div>
                <div className="bg-arena-950/80 p-4"><p className="metric-label">Matches</p><p className="mt-1 font-display text-4xl">{live ? live._count.matches : "00"}</p></div>
                <div className="bg-arena-950/80 p-4"><p className="metric-label">Field</p><p className="mt-1 font-display text-4xl">{participantCount || "00"}</p></div>
              </div>
              {live && <div className="mt-5 rounded-card border border-arena-700 bg-arena-900/60 p-4"><p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Now on air</p><div className="mt-2 flex items-center gap-3"> <GameIcon game={live.game} /><div className="min-w-0"><p className="truncate font-display text-xl uppercase">{live.name}</p><p className="truncate text-xs text-ink-faint">{live.game} · {live.venue ?? "Online"}</p></div></div></div>}
            </aside>
          </div>
        </section>

        {live && (
          <section className="ds-section">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="page-kicker">01 / Main stage</p><h2 className="section-heading mt-1">The live championship</h2><p className="page-subtitle mt-1">One event hub for the match, competition rules, field, standings and broadcast surface.</p></div>
              <Link href={`/tournaments/${live.id}/standings`} className="action-secondary self-start">Open standings</Link>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
              <Link href={`/tournaments/${live.id}`} className="surface-card surface-card-interactive group overflow-hidden p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><GameIcon game={live.game} /><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-corner-p2">{live.game} · {live.sport}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-ink-faint">{live.organization.name}</p></div></div><LiveBadge compact /></div>
                <h3 className="mt-8 max-w-3xl font-display text-4xl uppercase tracking-wide transition-colors group-hover:text-corner-p2 sm:text-5xl">{live.name}</h3>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted">{live.organization.tagline ?? "Official FGC competition broadcast hub."}</p>
                <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-arena-700 bg-arena-700 sm:grid-cols-4">{[["Format", live.format ?? "Custom"], ["Participants", String(participantCount)], ["Matches", String(live._count.matches)], ["Stages", String(live._count.stages)]].map(([label, value]) => <div key={label} className="bg-arena-950/75 p-3"><span className="metric-label">{label}</span><span className="mt-1 block truncate text-sm text-ink-muted">{value}</span></div>)}</div>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Link href={`/multiview?tournamentId=${live.id}`} className="surface-card surface-card-interactive p-5"><p className="section-label">02 / Broadcast</p><h3 className="mt-3 font-display text-2xl uppercase">Multi-view arena</h3><p className="mt-2 text-sm leading-6 text-ink-muted">Jump between stations and keep the live competition visible.</p><span className="mt-5 block font-mono text-[10px] font-bold uppercase tracking-widest text-signal-live">Watch now →</span></Link>
                <Link href={`/tournaments/${live.id}/standings`} className="surface-card surface-card-interactive p-5"><p className="section-label">03 / Competition</p><h3 className="mt-3 font-display text-2xl uppercase">Live standings</h3><p className="mt-2 text-sm leading-6 text-ink-muted">Track placement, results and progression from the same event hub.</p><span className="mt-5 block font-mono text-[10px] font-bold uppercase tracking-widest text-corner-p2">View table →</span></Link>
                <Link href={`/overlay/standings?tournamentId=${live.id}`} target="_blank" rel="noreferrer" className="surface-card surface-card-interactive p-5"><p className="section-label">04 / Broadcast source</p><h3 className="mt-3 font-display text-2xl uppercase">Standings overlay</h3><p className="mt-2 text-sm leading-6 text-ink-muted">Transparent browser source for OBS and other broadcast scenes. It reads the live competition data.</p><span className="mt-5 block font-mono text-[10px] font-bold uppercase tracking-widest text-corner-p2">Open source →</span></Link>
              </div>
            </div>
          </section>
        )}

        <section className="ds-section">
          <div className="mb-5"><p className="page-kicker">05 / Competition calendar</p><h2 className="section-heading mt-1">Every game, one stage</h2><p className="page-subtitle mt-1">The showcase pulls from the same public tournament data used by the viewer product.</p></div>
          {featured.length === 0 ? <div className="empty-state">No public showcase events are available yet. Seed the demo pack to populate the championship weekend.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{featured.map((t) => <Link key={t.id} href={`/tournaments/${t.id}`} className="surface-card surface-card-interactive group p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><GameIcon game={t.game} /><div className="min-w-0"><p className="truncate font-mono text-[10px] uppercase tracking-[.15em] text-corner-p2">{t.game}</p><p className="truncate font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.sport} · {t.participantMode}</p></div></div>{t.status === "LIVE" ? <LiveBadge compact /> : <span className="status-neutral">Upcoming</span>}</div><h3 className="mt-5 truncate font-display text-2xl uppercase group-hover:text-corner-p2">{t.name}</h3><div className="mt-5 grid grid-cols-2 gap-3 border-t border-arena-700 pt-4"><div><span className="metric-label">When</span><span className="mt-1 block text-xs text-ink-muted">{new Date(t.startDate).toLocaleDateString()}</span></div><div><span className="metric-label">Format</span><span className="mt-1 block truncate text-xs text-ink-muted">{t.scoringMode === "battle_royale" || t.sport === "bgmi" ? "Battle Royale" : t.format ?? "Custom"}</span></div></div><div className="mt-4 flex items-center justify-between border-t border-arena-700 pt-4"><span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t._count.teams + t._count.entrants} field entries</span><span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted group-hover:text-signal-live">Open →</span></div></Link>)}</div>}
        </section>

        {live?.sponsors.length ? <section className="pb-10"><div className="surface-card p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="page-kicker">06 / Partners</p><h2 className="section-heading mt-1 text-2xl">Powered by the ecosystem</h2></div><span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Official event partners</span></div><div className="mt-5 flex flex-wrap gap-3">{live.sponsors.map((s) => <div key={s.id} className="rounded-card border border-arena-700 bg-arena-950/60 px-5 py-3">{s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="h-7 max-w-32 object-contain" /> : <span className="font-display uppercase">{s.name}</span>}</div>)}</div></div></section> : null}
      </div>
    </main>
  );
}
