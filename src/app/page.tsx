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
  const networkStatus = liveTournaments.length > 0 ? "ON AIR" : "STANDBY";

  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="relative overflow-hidden rounded-section border border-arena-600 bg-arena-900 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-signal-live/[0.07] blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-corner-p2/[0.05] blur-3xl" aria-hidden="true" />

          <div className="relative grid lg:grid-cols-[1.25fr_.75fr]">
            <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <div className="flex flex-wrap items-center gap-2">
                <LiveBadge />
                <span className="section-label">FGC broadcast network</span>
                <span className="status-neutral">Network {networkStatus}</span>
              </div>
              <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold uppercase leading-[0.86] tracking-[0.025em] sm:text-7xl lg:text-8xl">
                The fight<br />is live.
              </h1>
              <p className="page-subtitle mt-6 max-w-2xl text-base leading-7 sm:text-lg">
                Find the match, see the score, jump between stations, and stay with the community while every other set keeps moving.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link href="/multiview" className="action-primary min-h-11 px-5">Watch live now</Link>
                <Link href="/tournaments" className="action-secondary min-h-11 px-5">Browse tournaments</Link>
                {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && (
                  <Link href="/dashboard" className="action-secondary min-h-11 px-5">Open control center</Link>
                )}
              </div>
            </div>

            <aside className="relative border-t border-arena-700 bg-arena-950/45 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8" aria-label="Network status">
              <div className="flex items-center justify-between border-b border-arena-700 pb-4">
                <div>
                  <p className="section-label">Broadcast console</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">FGC / GLOBAL SIGNAL</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-signal-live shadow-[0_0_16px_rgba(58,222,124,0.7)]" aria-hidden="true" />
              </div>

              <div className="mt-6 space-y-2">
                <div className="surface-quiet flex items-center justify-between p-4">
                  <span className="metric-label">Live events</span>
                  <span className="font-display text-3xl tracking-wide">{liveTournaments.length.toString().padStart(2, "0")}</span>
                </div>
                <div className="surface-quiet flex items-center justify-between p-4">
                  <span className="metric-label">Next up</span>
                  <span className="font-display text-3xl tracking-wide">{scheduledTournaments.length.toString().padStart(2, "0")}</span>
                </div>
                <div className="surface-quiet p-4">
                  <div className="flex items-center justify-between">
                    <span className="metric-label">Signal</span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-signal-live">{networkStatus}</span>
                  </div>
                  <div className="mt-4 flex h-8 items-end gap-1" aria-hidden="true">
                    {[28, 48, 36, 64, 44, 78, 52, 68, 40, 58, 34, 72, 46, 62].map((height, index) => (
                      <span key={index} className="flex-1 rounded-t-sm bg-signal-live/50" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-arena-700 pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">Network principle</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">One broadcast layer for every station, score, conversation and competition signal.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader eyebrow="Live signal" title="Live right now" href="/multiview" actionLabel="Open multi-view" />
          <div className="mt-4"><LiveGrid /></div>
        </section>

        <section className="mt-12 pb-4">
          <SectionHeader eyebrow="Competition calendar" title={liveTournaments.length > 0 ? "Live & upcoming" : "Upcoming tournaments"} description="Know what is happening now and what is worth watching next." href="/tournaments" actionLabel="View all" />
          {upcoming.length === 0 ? (
            <div className="empty-state mt-4"><p className="text-sm text-ink-faint">No public tournaments scheduled right now.</p><Link href="/tournaments" className="action-secondary mt-4">Browse competitions</Link></div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="surface-card surface-card-interactive group p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <GameIcon game={t.game} />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-signal-live">{t.game}</p>
                        <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.sport} · {t.competitionType}</p>
                      </div>
                    </div>
                    {t.status === "LIVE" ? <LiveBadge compact /> : <span className="status-neutral">Upcoming</span>}
                  </div>
                  <h3 className="mt-4 font-display text-2xl uppercase tracking-wide group-hover:text-signal-live">{t.name}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-arena-700 pt-3 text-xs text-ink-faint">
                    <div><span className="metric-label">When</span><span className="text-ink-muted">{new Date(t.startDate).toLocaleDateString()}</span></div>
                    <div><span className="metric-label">Where</span><span className="truncate text-ink-muted">{t.venue ?? "Online"}</span></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-arena-700 pt-3">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.scoringMode === "battle_royale" || t.sport === "bgmi" ? "Battle Royale · standings" : "Head-to-head competition"}</span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted transition-colors group-hover:text-signal-live">{t.status === "LIVE" ? "Watch →" : "View →"}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {scheduledTournaments.length === 0 && liveTournaments.length > 0 && <p className="mt-3 text-xs text-ink-faint">No additional public events are scheduled after the live competitions.</p>}
        </section>
      </div>
    </main>
  );
}
