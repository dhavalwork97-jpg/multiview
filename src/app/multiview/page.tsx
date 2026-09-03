import { getCurrentUser } from "@/lib/auth";
import { isPremium, maxMultiViewTiles } from "@/lib/billing";
import { db } from "@/lib/db";
import { MultiView } from "@/components/watch/MultiView";
import { BillingButton } from "@/components/billing/BillingButton";

// Ties Phase 3's MultiView component to Phase 4's subscription gating:
// free viewers get 4 tiles, Premium gets 9 — see src/lib/billing.ts for
// why this particular feature is the one behind the paywall (WebRTC and
// multi-view are both the higher-infra-cost viewing paths).
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
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            Multi-view · {tiles} tiles
          </p>
          <h1 className="font-display text-3xl uppercase tracking-wide">Watch every station</h1>
        </div>
        {!isPremium(user) && <BillingButton isPremium={false} />}
      </header>

      {stations.length === 0 ? (
        <p className="text-sm text-ink-faint">No stations are live right now.</p>
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

      {!isPremium(user) && (
        <p className="mt-4 text-xs text-ink-faint">
          Free tier shows up to 4 stations at once — upgrade to Premium for the full 9-tile view.
        </p>
      )}
    </main>
  );
}
