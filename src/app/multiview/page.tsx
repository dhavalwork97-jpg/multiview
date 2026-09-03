import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isPremium, maxMultiViewTiles } from "@/lib/billing";
import { db } from "@/lib/db";
import { MultiView } from "@/components/watch/MultiView";
import { BillingButton } from "@/components/billing/BillingButton";

// Phase 3's streaming surface with Phase 4's shared navigation/page system.
export default async function MultiViewPage({
  searchParams,
}: {
  searchParams: Promise<{ tournamentId?: string }>;
}) {
  const { tournamentId } = await searchParams;
  const user = await getCurrentUser();
  const tiles = maxMultiViewTiles(user);

  const stations = await db.station.findMany({
    where: {
      status: "LIVE",
      ...(tournamentId ? { tournamentId } : {}),
    },
    orderBy: { label: "asc" },
    take: tiles,
    select: { id: true, label: true, youtubeVideoId: true, playbackIdHls: true },
  });

  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="page-kicker text-signal-live">Live signal · {tiles} tiles</p>
            <h1 className="page-title mt-1">Watch every station</h1>
            <p className="page-subtitle">Monitor every active station in one control-friendly viewing surface.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/tournaments" className="action-secondary">Find tournaments</Link>
            {!isPremium(user) && <BillingButton isPremium={false} />}
          </div>
        </header>

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
