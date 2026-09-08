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
    },
  });

  const liveTournaments = upcoming.filter((t) => t.status === "LIVE");
  const scheduledTournaments = upcoming.filter((t) => t.status === "SCHEDULED");
  const networkStatus = liveTournaments.length > 0 ? "ON AIR" : "STANDBY";

  return (
    <main className="page-shell overflow-hidden">
      <div className="page-container">
        <section className="relative isolate min-h-[590px] overflow-hidden rounded-section border border-arena-600 bg-arena-950 shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
          <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:56px_56px]" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-40 top-20 h-[30rem] w-[30rem] rounded-full bg-signal-live/[0.055] blur-[110px]" aria-hidden="true" />
          <div className="pointer-events-none absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-corner-p2/[0.09] blur-[120px]" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-signal-live/60 to-transparent" aria-hidden="true" />

          <div className="relative grid min-h-[590px] lg:grid-cols-[1.15fr_.85fr]">
            <div className="flex flex-col justify-between px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <LiveBadge />
                  <span className="section-label">Competitive network / 01</span>
                </div>

                <div className="mt-10 max-w-4xl">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-signal-live">Watch the arena, not the noise.</p>
                  <h1 className="mt-4 font-display text-[4.2rem] font-semibold uppercase leading-[0.78] tracking-[0.01em] sm:text-[6.8rem] lg:text-[8.2rem]">
                    FIGHT<br />
                    <span className="text-ink-muted">NIGHT.</span>
                  </h1>
                  <p className="page-subtitle mt-7 max-w-xl text-base leading-7 sm:text-lg">
                    Live matches. Real scores. Every station in one place. Follow the competition from first bracket call to final set.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <Link href="/multiview" className="action-primary min-h-12 px-6">Enter live arena <span aria-hidden="true">→</span></Link>
                  <Link href="/tournaments" className="action-secondary min-h-12 px-6">Explore competitions</Link>
                  {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && (
                    <Link href="/dashboard" className="action-ghost min-h-12 px-4">Control center</Link>
                  )}
                </div>
              </div>

              <div className="mt-12 grid max-w-2xl grid-cols-3 border-y border-arena-700 py-4">
                <div className="border-r border-arena-700 pr-3">
                  <p className="metric-label">Live events</p>
                  <p className="mt-1 font-display text-3xl">{liveTournaments.length.toString().padStart(2, "0")}</p>
                </div>
                <div className="border-r border-arena-700 px-3">
                  <p className="metric-label">Upcoming</p>
                  <p className="mt-1 font-display text-3xl">{scheduledTournaments.length.toString().padStart(2, "0")}</p>
                </div>
                <div className="pl-3">
                  <p className="metric-label">Network</p>
                  <p className="mt-1 font-mono text-lg font-bold text-signal-live">{networkStatus}</p>
                </div>
              </div>
            </div>

            <aside className="relative hidden overflow-hidden border-l border-arena-700 bg-arena-900/55 lg:block" aria-label="FGC broadcast preview">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(58,222,124,0.10),transparent_35%)]" />
              <div className="relative flex h-full flex-col justify-between p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-label">Broadcast console</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-ink-faint">FGC / GLOBAL SIGNAL</p>
                  </div>
                  <span className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-widest text-signal-live">
                    <span className="h-2 w-2 rounded-full bg-signal-live shadow-[0_0_16px_rgba(58,222,124,0.8)]" />
                    {networkStatus}
                  </span>
                </div>

                <div className="relative mx-auto w-full max-w-sm">
                  <div className="absolute -inset-10 rounded-full border border-signal-live/10" />
                  <div className="absolute -inset-20 rounded-full border border-signal-live/5" />
                  <div className="relative aspect-square rounded-full border border-arena-600 bg-arena-950/80 p-4 shadow-[inset_0_0_60px_rgba(0,0,0,0.65)]">
                    <div className="flex h-full flex-col items-center justify-center rounded-full border border-arena-700 bg-arena-900/60 text-center">
                      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint">Network state</p>
                      <p className="mt-2 font-display text-5xl uppercase tracking-wider text-signal-live">{networkStatus}</p>
                      <div className="mt-5 flex items-end gap-1" aria-hidden="true">
                        {[20, 38, 28, 58, 44, 74, 52, 88, 46, 68, 34, 78, 42, 62, 30].map((height, index) => (
                          <span key={index} className="w-1 rounded-t-sm bg-signal-live/60" style={{ height: `${height}px` }} />
                        ))}
                      </div>
                      <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">One signal / every station</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="surface-quiet p-4">
                    <p className="metric-label">Next broadcast</p>
                    <p className="mt-2 truncate font-display text-xl uppercase">{scheduledTournaments[0]?.name ?? "Awaiting event"}</p>
                  </div>
                  <div className="surface-quiet p-4">
                    <p className="metric-label">Experience</p>
                    <p className="mt-2 font-display text-xl uppercase">Multi-view ready</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Live signal" title="Watch what is happening now" href="/multiview" actionLabel="Open multi-view" />
          <div className="mt-5">
            <LiveGrid />
          </div>
        </section>

        <section className="mt-14">
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/multiview" className="group surface-card surface-card-interactive relative overflow-hidden p-6 sm:p-7">
              <span className="absolute right-5 top-5 font-mono text-[9px] text-ink-faint">01</span>
              <span className="section-label">For viewers</span>
              <h2 className="mt-4 font-display text-3xl uppercase tracking-wide group-hover:text-signal-live">One arena.<br />Every station.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">Jump between live matches, scores, chat, reactions and the moments worth staying for.</p>
              <span className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-signal-live">Enter multi-view →</span>
            </Link>
            <Link href="/community" className="group surface-card surface-card-interactive relative overflow-hidden p-6 sm:p-7">
              <span className="absolute right-5 top-5 font-mono text-[9px] text-ink-faint">02</span>
              <span className="section-label">For community</span>
              <h2 className="mt-4 font-display text-3xl uppercase tracking-wide group-hover:text-signal-live">Stay in<br />the moment.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">Follow the conversation with realtime chat, reactions, threads, activity and watch-party presence.</p>
              <span className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-signal-live">Join the community →</span>
            </Link>
            <Link href="/tournaments" className="group surface-card surface-card-interactive relative overflow-hidden p-6 sm:p-7">
              <span className="absolute right-5 top-5 font-mono text-[9px] text-ink-faint">03</span>
              <span className="section-label">For competition</span>
              <h2 className="mt-4 font-display text-3xl uppercase tracking-wide group-hover:text-signal-live">Find the<br />next bracket.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">Discover upcoming tournaments, follow event schedules and keep every competition on your radar.</p>
              <span className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-signal-live">Browse tournaments →</span>
            </Link>
          </div>
        </section>

        <section className="mt-14 pb-6">
          <SectionHeader
            eyebrow="Competition calendar"
            title={liveTournaments.length > 0 ? "Live & upcoming" : "Upcoming tournaments"}
            description="The next events worth putting on your radar."
            href="/tournaments"
            actionLabel="View all"
          />
          {upcoming.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-ink-faint">No public tournaments scheduled right now.</p>
              <Link href="/tournaments" className="action-secondary mt-4">Browse competitions</Link>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="surface-card surface-card-interactive group p-5 sm:p-6">
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
                  <h3 className="mt-5 font-display text-2xl uppercase tracking-wide transition-colors group-hover:text-signal-live">{t.name}</h3>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-arena-700 pt-4 text-xs">
                    <div><span className="metric-label">When</span><span className="mt-1 block text-ink-muted">{new Date(t.startDate).toLocaleDateString()}</span></div>
                    <div><span className="metric-label">Where</span><span className="mt-1 block truncate text-ink-muted">{t.venue ?? "Online"}</span></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-arena-700 pt-4">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{t.scoringMode === "battle_royale" || t.sport === "bgmi" ? "Battle Royale · standings" : "Head-to-head competition"}</span>
                    <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted transition-colors group-hover:text-signal-live">{t.status === "LIVE" ? "Watch →" : "View →"}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
