import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isPremium, maxMultiViewTiles } from "@/lib/billing";
import { db } from "@/lib/db";
import { MultiView } from "@/components/watch/MultiView";
import { BillingButton } from "@/components/billing/BillingButton";

// Phase 3 streaming surface with the shared Phase 4 navigation and visual system.
export default async function MultiViewPage({
  searchParams,
}: {
  searchParams: Promise<{ tournamentId?: string }>;
}) {
  const { tournamentId } = await searchParams;
  const user = await getCurrentUser();
  const tiles = maxMultiViewTiles(user);

  const [stations, tournament] = await Promise.all([
    db.station.findMany({
      where: {
        status: "LIVE",
        ...(tournamentId ? { tournamentId } : {}),
      },
      orderBy: { label: "asc" },
      take: tiles,
      select: { id: true, label: true, youtubeVideoId: true, playbackIdHls: true },
    }),
    tournamentId
      ? db.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, name: true, game: true, status: true } })
      : Promise.resolve(null),
  ]);

  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="page-kicker text-signal-live">Live signal · {tiles} tiles</p>
              <h1 className="page-title mt-1">Watch every station</h1>
              <p className="page-subtitle">Monitor every active station in one control-friendly viewing surface.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/tournaments" className="action-secondary">Find tournaments</Link>
              {!isPremium(user) && <BillingButton isPremium={false} />}
            </div>
          </div>
          <nav aria-label="Viewing navigation" className="context-tabs mt-4">
            <Link href="/" className="context-tab">Home</Link>
            <Link href="/tournaments" className="context-tab">Tournaments</Link>
            {tournament && <Link href={`/tournaments/${tournament.id}`} className="context-tab">{tournament.game} · {tournament.name}</Link>}
            <span className="context-tab context-tab-active" aria-current="page">Multi-View</span>
          </nav>
        </header>

        {tournament && (
          <section className="surface-card mb-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="page-kicker text-signal-live">{tournament.game}</p><h2 className="mt-1 truncate font-display text-2xl uppercase tracking-wide">{tournament.name}</h2></div>
            <span className={tournament.status === "LIVE" ? "status-live" : "status-neutral"}>{tournament.status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{tournament.status}</span>
          </section>
        )}

        <section className="surface-card overflow-hidden p-2 sm:p-3">
          {stations.length === 0 ? (
            <div className="empty-state border-0 bg-transparent py-16">
              <p className="page-kicker text-signal-live">No live signal</p>
              <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-ink">No stations are live right now</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Return to the tournament hub to find the next scheduled competition.</p>
              <Link href="/tournaments" className="action-secondary mt-5">Browse tournaments</Link>
            </div>
          ) : (
            <MultiView
              stations={stations.map((s) => ({
                id: s.id,
                label: s.label,
                youtubeVideoId: s.youtubeVideoId,
                hlsPlaylistKey: s.playbackIdHls ? `${s.playbackIdHls}/index.m3u8` : null,
              }))}
              layout={tiles}
            />
          )}
        </section>

        <footer className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-faint">
            {isPremium(user) ? "Premium viewing · up to 9 stations at once." : "Free viewing · up to 4 stations at once."}
          </p>
          <Link href="/" className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint hover:text-signal-live">Back to home →</Link>
        </footer>
      </div>
    </main>
  );
}
