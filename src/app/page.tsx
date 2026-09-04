import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LiveGrid } from "@/components/dashboard/LiveGrid";
import { GameIcon } from "@/components/competition/GameIcon";
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
        <section className="surface-card relative overflow-hidden p-6 sm:p-10 lg:p-14">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-signal-live/[0.025]" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="page-kicker text-signal-live">Every station, live</p>
            <h1 className="mt-2 font-display text-4xl font-semibold uppercase leading-[0.95] tracking-[0.04em] sm:text-6xl">
              Watch any match, on any station, the instant it starts.
            </h1>
            <p className="page-subtitle mt-5 max-w-2xl text-base leading-7">
              Pick a bracket, click a match, watch it — while every other station keeps streaming in the background so you can switch anytime.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/multiview" className="action-primary min-h-11 px-5">Watch live now</Link>
              <Link href="/tournaments" className="action-secondary min-h-11 px-5">Browse tournaments</Link>
              {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && (
                <Link href="/dashboard" className="action-secondary min-h-11 px-5">Manage tournaments</Link>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="section-label">Live signal</p><h2 className="page-title mt-1 text-2xl sm:text-3xl">Live right now</h2></div>
            <Link href="/multiview" className="action-secondary hidden sm:inline-flex">Open multi-view →</Link>
          </div>
          <LiveGrid />
        </section>

        <section className="mt-10 pb-4">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="section-label">Competition calendar</p>
              <h2 className="page-title mt-1 text-2xl sm:text-3xl">{liveTournaments.length > 0 ? "Live & upcoming" : "Upcoming tournaments"}</h2>
              <p className="page-subtitle mt-1">Jump back into a live event or plan what to watch next.</p>
            </div>
            <Link href="/tournaments" className="action-secondary">View all →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state"><p className="text-sm text-ink-faint">No public tournaments scheduled right now.</p><Link href="/tournaments" className="action-secondary mt-4">Browse competitions</Link></div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    {t.status === "LIVE" ? <span className="status-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" aria-hidden="true" />Live</span> : <span className="status-neutral">Upcoming</span>}
                  </div>
                  <h3 className="mt-4 font-display text-2xl uppercase tracking-wide group-hover:text-signal-live">{t.name}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-arena-700 pt-3 text-xs text-ink-faint">
                    <div><span className="block font-mono text-[9px] uppercase tracking-widest text-ink-faint">When</span><span className="text-ink-muted">{new Date(t.startDate).toLocaleDateString()}</span></div>
                    <div><span className="block font-mono text-[9px] uppercase tracking-widest text-ink-faint">Where</span><span className="truncate text-ink-muted">{t.venue ?? "Online"}</span></div>
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
