import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { GameIcon } from "@/components/competition/GameIcon";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { db } from "@/lib/db";

export default async function HomePage() {
  const user = await getCurrentUser();
  const upcoming = await db.tournament.findMany({
    where: { status: { in: ["LIVE", "SCHEDULED"] }, publicEnabled: true },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
    take: 6,
    select: { id: true, name: true, game: true, sport: true, competitionType: true, scoringMode: true, status: true, startDate: true, venue: true },
  });

  const liveTournaments = upcoming.filter((t) => t.status === "LIVE");
  const scheduledTournaments = upcoming.filter((t) => t.status === "SCHEDULED");

  return (
    <main className="page-shell overflow-hidden">
      <div className="page-container">
        <section className="ds-grid relative isolate overflow-hidden rounded-shell border border-arena-600 bg-arena-950 shadow-[0_35px_120px_rgba(0,0,0,.5)]">
          <div className="pointer-events-none absolute -left-32 top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-corner-p2/[.12] blur-[120px]" />
          <div className="pointer-events-none absolute right-[-10rem] top-10 h-[30rem] w-[30rem] rounded-full bg-signal-live/[.08] blur-[110px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-1/2 bg-corner-p1/[.06] blur-[80px]" />

          <div className="relative grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="flex min-h-[560px] flex-col justify-between border-b border-arena-700 p-6 sm:p-9 lg:border-b-0 lg:border-r lg:p-12">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-live"><span className="live-dot animate-live-pulse" /> Live now</span>
                  <span className="status-neutral">FGC / GLOBAL</span>
                  <span className="font-mono text-[9px] uppercase tracking-[.18em] text-ink-faint">Next-gen esports</span>
                </div>
                <div className="mt-12 max-w-3xl">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[.28em] text-corner-p2">Watch the arena, not the noise.</p>
                  <h1 className="mt-4 display-hero">
                    FGC<br /><span className="text-ink-muted">LIVE.</span>
                  </h1>
                  <p className="mt-7 max-w-xl text-sm leading-7 text-ink-muted sm:text-base">Live matches, real scores, community energy and every station in one place. Follow the competition from first bracket call to final set.</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  <Link href="/multiview" className="action-primary min-h-12 bg-corner-p2 px-6 text-ink shadow-violet hover:brightness-110">Enter live arena <span aria-hidden>→</span></Link>
                  <Link href="/tournaments" className="action-secondary min-h-12 px-6">Explore tournaments</Link>
                  {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && <Link href="/dashboard" className="action-ghost min-h-12">Control center</Link>}
                </div>
              </div>

              <div className="mt-12 grid max-w-2xl grid-cols-3 border-y border-arena-700 py-4">
                <div className="border-r border-arena-700 pr-3"><p className="metric-label">Live events</p><p className="mt-1 font-display text-3xl">{liveTournaments.length.toString().padStart(2, "0")}</p></div>
                <div className="border-r border-arena-700 px-3"><p className="metric-label">Upcoming</p><p className="mt-1 font-display text-3xl">{scheduledTournaments.length.toString().padStart(2, "0")}</p></div>
                <div className="pl-3"><p className="metric-label">Network</p><p className="mt-1 font-mono text-lg font-bold text-signal-live">{liveTournaments.length ? "ON AIR" : "STANDBY"}</p></div>
              </div>
            </div>

            <aside className="relative hidden min-h-[560px] overflow-hidden bg-[radial-gradient(circle_at_50%_38%,rgba(108,99,255,.18),transparent_38%),linear-gradient(160deg,rgba(21,23,34,.88),rgba(7,7,11,.98))] lg:block">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute h-[26rem] w-[26rem] rounded-full border border-corner-p2/15" />
                <div className="absolute h-[20rem] w-[20rem] rounded-full border border-signal-live/15" />
                <div className="absolute h-[14rem] w-[14rem] rounded-full border border-corner-p1/10" />
                <div className="relative h-64 w-64 rounded-full border border-arena-600 bg-arena-950/90 p-5 shadow-[inset_0_0_80px_rgba(0,0,0,.8),0_0_80px_rgba(108,99,255,.12)]">
                  <div className="flex h-full flex-col items-center justify-center rounded-full border border-arena-700 bg-arena-900/75 text-center backdrop-blur">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[.25em] text-ink-faint">Broadcast state</span>
                    <span className="mt-3 font-display text-5xl uppercase text-corner-p2">{liveTournaments.length ? "LIVE" : "READY"}</span>
                    <span className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-corner-p1 via-corner-p2 to-signal-live" />
                    <span className="mt-4 font-mono text-[8px] uppercase tracking-[.2em] text-ink-faint">One signal / every station</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-6 bottom-6 grid grid-cols-2 gap-2">
                <div className="surface-quiet p-4"><p className="metric-label">Next broadcast</p><p className="mt-2 truncate font-display text-lg uppercase">{scheduledTournaments[0]?.name ?? "Awaiting event"}</p></div>
                <div className="surface-quiet p-4"><p className="metric-label">Experience</p><p className="mt-2 font-display text-lg uppercase">Multi-view ready</p></div>
              </div>
            </aside>
          </div>
        </section>

        <section className="ds-section">
          <SectionHeader eyebrow="01 / Live signal" title="Watch what is happening now" href="/multiview" actionLabel="Open multi-view" />
          <div className="mt-5"><LiveGrid /></div>
        </section>

        <section className="pb-8">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-arena-700/80 pb-4"><div><p className="page-kicker">02 / Product experience</p><h2 className="section-heading mt-1">Built around the moment</h2></div></div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["01", "For viewers", "One arena. Every station.", "Jump between live matches, scores, chat, reactions and the moments worth staying for.", "/multiview", "Enter multi-view"],
              ["02", "For community", "Stay in the moment.", "Realtime chat, reactions, threads, activity and watch-party presence without leaving the action.", "/community", "Join community"],
              ["03", "For competition", "Find the next bracket.", "Discover upcoming tournaments, schedules, standings and the competitions worth following.", "/tournaments", "Browse tournaments"],
            ].map(([index, eyebrow, title, copy, href, action]) => (
              <Link key={index} href={href} className="group surface-card surface-card-interactive relative overflow-hidden p-6 sm:p-7">
                <span className="absolute right-5 top-5 font-mono text-[9px] text-ink-faint">{index}</span>
                <span className="section-label">{eyebrow}</span>
                <h3 className="mt-4 font-display text-3xl uppercase tracking-wide transition-colors group-hover:text-corner-p2">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{copy}</p>
                <span className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint transition-colors group-hover:text-signal-live">{action} →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ds-section pt-8">
          <SectionHeader eyebrow="03 / Competition calendar" title={liveTournaments.length ? "Live & upcoming" : "Upcoming tournaments"} description="The next events worth putting on your radar." href="/tournaments" actionLabel="View all" />
          {upcoming.length === 0 ? <div className="empty-state mt-5"><p className="text-sm text-ink-faint">No public tournaments scheduled right now.</p><Link href="/tournaments" className="action-secondary mt-4">Browse competitions</Link></div> : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="surface-card surface-card-interactive group p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><GameIcon game={t.game} /><div className="min-w-0"><p className="truncate font-mono text-[10px] font-bold uppercase tracking-[.14em] text-corner-p2">{t.game}</p><p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.sport} · {t.competitionType}</p></div></div>{t.status === "LIVE" ? <LiveBadge compact /> : <span className="status-neutral">Upcoming</span>}</div>
                  <h3 className="mt-5 font-display text-2xl uppercase tracking-wide transition-colors group-hover:text-corner-p2">{t.name}</h3>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-arena-700 pt-4"><div><span className="metric-label">When</span><span className="mt-1 block text-xs text-ink-muted">{new Date(t.startDate).toLocaleDateString()}</span></div><div><span className="metric-label">Where</span><span className="mt-1 block truncate text-xs text-ink-muted">{t.venue ?? "Online"}</span></div></div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-arena-700 pt-4"><span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.scoringMode === "battle_royale" || t.sport === "bgmi" ? "Battle Royale · standings" : "Head-to-head competition"}</span><span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted group-hover:text-signal-live">{t.status === "LIVE" ? "Watch →" : "View →"}</span></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
