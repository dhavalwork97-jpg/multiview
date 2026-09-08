import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isPremium, maxMultiViewTiles } from "@/lib/billing";
import { db } from "@/lib/db";
import { MultiView } from "@/components/watch/MultiView";
import { BillingButton } from "@/components/billing/BillingButton";

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
      where: { status: "LIVE", ...(tournamentId ? { tournamentId } : {}) },
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
        <header className="ds-grid relative mb-6 overflow-hidden border-b border-arena-700 py-8 sm:py-10">
          <div className="ds-glow right-[-5rem] top-[-7rem] h-64 w-64" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-3"><p className="page-kicker text-signal-live">Broadcast / multi-view</p><span className="status-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" /> Live signal</span></div>
              <h1 className="display-heading mt-3 text-5xl sm:text-7xl">Watch every station.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">One broadcast surface for the active competition. Choose a tournament context when you want a focused station wall.</p>
            </div>
            <div className="surface-console min-w-64 p-4">
              <div className="flex items-end justify-between gap-5"><div><p className="ds-index">VIEWER CAPACITY</p><p className="mt-2 font-display text-4xl uppercase">{tiles} <span className="font-sans text-sm font-normal text-ink-muted">tiles</span></p></div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint">{isPremium(user) ? "Premium" : "Free"}</p></div>
            </div>
          </div>
          <nav aria-label="Viewing navigation" className="context-tabs relative mt-6">
            <Link href="/" className="context-tab">Home</Link>
            <Link href="/live" className="context-tab">Live</Link>
            <Link href="/tournaments" className="context-tab">Tournaments</Link>
            {tournament && <Link href={`/tournaments/${tournament.id}`} className="context-tab">{tournament.game} · {tournament.name}</Link>}
            <span className="context-tab context-tab-active" aria-current="page">Multi-View</span>
          </nav>
        </header>

        {tournament && (
          <section className="surface-card mb-4 overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="page-kicker text-signal-live">Tournament context · {tournament.game}</p><h2 className="mt-1 truncate font-display text-3xl uppercase tracking-wide">{tournament.name}</h2></div>
              <div className={tournament.status === "LIVE" ? "status-live" : "status-neutral"}>{tournament.status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{tournament.status}</div>
            </div>
          </section>
        )}

        <section className="surface-console overflow-hidden p-2 sm:p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 pt-1 sm:px-3">
            <div><p className="ds-index">SIGNAL WALL / {stations.length} ACTIVE</p><p className="mt-1 text-xs text-ink-faint">Stations are sourced directly from live broadcast state.</p></div>
            {!isPremium(user) && <BillingButton isPremium={false} />}
          </div>
          {stations.length === 0 ? (
            <div className="empty-state border-0 bg-transparent py-20">
              <p className="page-kicker text-signal-live">No live signal</p>
              <h2 className="mt-2 font-display text-3xl uppercase tracking-wide text-ink">No stations are live right now</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">Return to the tournament hub to find the next scheduled competition.</p>
              <Link href="/tournaments" className="action-secondary mt-5">Browse tournaments</Link>
            </div>
          ) : (
            <MultiView stations={stations.map((s) => ({ id: s.id, label: s.label, youtubeVideoId: s.youtubeVideoId, hlsPlaylistKey: s.playbackIdHls ? `${s.playbackIdHls}/index.m3u8` : null }))} layout={tiles} />
          )}
        </section>

        <footer className="mt-4 flex flex-col gap-2 border-t border-arena-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-faint">{isPremium(user) ? "Premium viewing · up to 9 stations at once." : "Free viewing · up to 4 stations at once."}</p>
          <div className="flex gap-4"><Link href="/matches" className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint hover:text-signal-live">Match center →</Link><Link href="/" className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint hover:text-signal-live">Home →</Link></div>
        </footer>
      </div>
    </main>
  );
}
