import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  LIVE: "text-signal-live",
  SCHEDULED: "text-ink-muted",
  COMPLETED: "text-ink-faint",
  ARCHIVED: "text-ink-faint",
  DRAFT: "text-ink-faint",
};

// Public, no sign-in required (see middleware.ts) — this is the page
// "Tournaments" in the nav actually points to. Without it, that link
// and the homepage's "Browse tournaments" CTA had nowhere real to go
// beyond a single tournament's own /tournaments/:id page, which needs
// an ID you can't otherwise discover.
export default async function TournamentsPage() {
  const tournaments = await db.tournament.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: {
      id: true,
      name: true,
      game: true,
      sport: true,
      competitionType: true,
      status: true,
      startDate: true,
      venue: true,
      _count: { select: { brackets: true } },
    },
  });

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Browse</p>
        <h1 className="font-display text-3xl uppercase tracking-wide">Tournaments</h1>
      </header>

      {tournaments.length === 0 ? (
        <p className="text-sm text-ink-faint">No tournaments yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="rounded-card border border-arena-600 bg-arena-800 p-4 transition-colors hover:border-signal-live"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  {t.sport} · {t.game}
                </span>
                <span
                  className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest ${STATUS_STYLE[t.status]}`}
                >
                  {t.status === "LIVE" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />
                  )}
                  {t.status}
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg uppercase tracking-wide">{t.name}</h2>
              <p className="mt-1 text-xs text-ink-faint">
                {t.venue ? `${t.venue} · ` : ""}
                {new Date(t.startDate).toLocaleDateString()}
              </p>
              {t._count.brackets === 0 && (
                <p className="mt-2 text-xs text-ink-faint">No bracket published yet</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
