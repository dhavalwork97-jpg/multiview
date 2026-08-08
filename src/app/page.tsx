import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LiveGrid } from "@/components/dashboard/LiveGrid";

// The three destinations a visitor actually wants from here: jump
// straight into whatever's live (Multi-View), browse tournaments to
// pick a specific bracket/match, or — if they're an organizer — get to
// their own tournaments. Everything below the hero exists to get people
// to one of those three faster than typing a URL.
export default async function HomePage() {
  const user = await getCurrentUser();

  const upcoming = await db.tournament.findMany({
    where: { status: { in: ["LIVE", "SCHEDULED"] } },
    orderBy: { startDate: "asc" },
    take: 6,
    select: { id: true, name: true, game: true, status: true, startDate: true, venue: true },
  });

  return (
    <main className="min-h-screen bg-arena-950">
      <section className="border-b border-arena-700 px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-signal-live">
          Every station, live
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl uppercase leading-tight tracking-wide sm:text-5xl">
          Watch any match, on any station, the instant it starts.
        </h1>
        <p className="mt-4 max-w-xl text-ink-muted">
          Pick a bracket, click a match, watch it — while every other station keeps streaming in
          the background so you can switch anytime.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/multiview"
            className="rounded-card bg-signal-live px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-arena-950 transition-opacity hover:opacity-90"
          >
            Watch live now
          </Link>
          <Link
            href="/tournaments"
            className="rounded-card border border-arena-600 px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:border-signal-live hover:text-signal-live"
          >
            Browse tournaments
          </Link>
          {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && (
            <Link
              href="/dashboard"
              className="rounded-card border border-arena-600 px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ink-muted transition-colors hover:border-signal-live hover:text-signal-live"
            >
              Manage your tournaments
            </Link>
          )}
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide text-ink-muted">
            Live right now
          </h2>
          <Link
            href="/multiview"
            className="font-mono text-xs uppercase tracking-wide text-ink-faint hover:text-signal-live"
          >
            Open multi-view →
          </Link>
        </div>
        <LiveGrid />
      </section>

      <section className="px-6 pb-16 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide text-ink-muted">
            Tournaments
          </h2>
          <Link
            href="/tournaments"
            className="font-mono text-xs uppercase tracking-wide text-ink-faint hover:text-signal-live"
          >
            View all →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-faint">No tournaments scheduled right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="rounded-card border border-arena-600 bg-arena-800 p-4 transition-colors hover:border-signal-live"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    {t.game}
                  </span>
                  {t.status === "LIVE" && (
                    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-signal-live">
                      <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-display text-lg uppercase tracking-wide">{t.name}</h3>
                <p className="mt-1 text-xs text-ink-faint">
                  {t.venue ? `${t.venue} · ` : ""}
                  {new Date(t.startDate).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
