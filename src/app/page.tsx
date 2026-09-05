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
    <main className="page-shell">
      <div className="page-container">
        <section className="relative overflow-hidden rounded-section bg-arena-900 px-5 py-8 ring-1 ring-arena-600 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-signal-live/[0.035]" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <LiveBadge />
                <span className="section-label">FGC broadcast network</span>
              </div>
              <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold uppercase leading-[0.92] tracking-[0.035em] sm:text-6xl lg:text-7xl">
                The fight is live.
              </h1>
              <p className="page-subtitle mt-5 max-w-2xl text-base leading-7 sm:text-lg">
                Find the match, see the score, jump between stations, and stay with the community while every other set keeps moving.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/multiview" className="action-primary min-h-11 px-5">Watch live now</Link>
                <Link href="/tournaments" className="action-secondary min-h-11 px-5">Browse tournaments</Link>
                {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && (
                  <Link href="/dashboard" className="action-secondary min-h-11 px-5">Open control center</Link>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-arena-700 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div><p className="metric-label">Live events</p><p className="metric-value mt-1">{liveTournaments.length}</p></div>
              <div><p className="metric-label">Next up</p><p className="metric-value mt-1">{scheduledTournaments.length}</p></div>
              <div><p className="metric-label">Stations</p><p className="metric-value mt-1">LIVE</p></div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader eyebrow="Live signal" title="Live right now" href="/multiview" actionLabel="Open multi-view" />
          <div className="mt-4"><LiveGrid /></div>
        </section>

        <section className="mt-10 pb-4">
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
