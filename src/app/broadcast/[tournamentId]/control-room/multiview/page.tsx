import Link from "next/link";
import { requireTournamentAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { MultiView } from "@/components/watch/MultiView";

export default async function BroadcastMultiViewPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  try {
    await requireTournamentAccess(tournamentId);
  } catch {
    return null;
  }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, game: true },
  });

  if (!tournament) return null;

  const stations = await db.station.findMany({
    where: { tournamentId, status: "LIVE" },
    orderBy: { label: "asc" },
    take: 9,
    select: {
      id: true,
      label: true,
      youtubeVideoId: true,
      playbackIdHls: true,
    },
  });

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".15em", opacity: .45 }}>FGC BROADCAST STUDIO · LIVE POV</div>
            <h1 style={{ fontSize: 32, margin: "7px 0 0" }}>MultiView / Station Feeds</h1>
            <div style={{ marginTop: 7, fontSize: 12, opacity: .5 }}>{tournament.game} · {tournament.name} · {stations.length} live feeds</div>
          </div>
          <nav style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Link href={`/broadcast/${tournamentId}/control-room`} style={link}>PRODUCTION CONTROL</Link>
            <Link href={`/broadcast/${tournamentId}/control-room/obs`} style={link}>OBS</Link>
            <Link href={`/broadcast/${tournamentId}/control-room/replay`} style={link}>REPLAY</Link>
          </nav>
        </header>

        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={label}>OPERATOR MONITOR WALL</div>
              <h2 style={{ margin: "6px 0 0", fontSize: 18 }}>All active station POVs</h2>
            </div>
            <span style={status}>LIVE SIGNAL · AUDIO FOCUS PER FEED</span>
          </div>
          {stations.length ? (
            <MultiView
              stations={stations.map((station) => ({
                id: station.id,
                label: station.label,
                youtubeVideoId: station.youtubeVideoId,
                hlsPlaylistKey: station.playbackIdHls ? `${station.playbackIdHls}/index.m3u8` : null,
              }))}
              layout={9}
            />
          ) : (
            <div style={{ padding: "80px 20px", textAlign: "center", border: "1px dashed #252936", borderRadius: 16, color: "#8b90a0" }}>
              No live station feeds are available for this tournament.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 18 } as const;
const label = { fontSize: 10, letterSpacing: ".15em", opacity: .45 } as const;
const link = { color: "#c4b5fd", textDecoration: "none", fontSize: 11, letterSpacing: ".12em" } as const;
const status = { border: "1px solid #164e63", borderRadius: 999, padding: "7px 10px", color: "#67e8f9", fontSize: 9, letterSpacing: ".12em" } as const;
