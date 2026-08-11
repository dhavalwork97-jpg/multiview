import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPremium } from "@/lib/billing";
import { WatchPageClient } from "./WatchPageClient";

// Video playback (WebRTC low-latency path + HLS fallback, adaptive
// bitrate, DVR) is Phase 3 scope. This page exists now so every
// click-through added in Phase 2 — the live grid, the bracket, search —
// has a real destination and the live match state (score, status, viewer
// count) is already wired end-to-end over Socket.IO.
export default async function WatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      round: true,
      status: true,
      playerOneScore: true,
      playerTwoScore: true,
      tournamentId: true,
      startedAt: true,
      playerOne: { select: { gamertag: true } },
      playerTwo: { select: { gamertag: true } },
      station: { select: { id: true, label: true, playbackIdHls: true, playbackIdWebrtc: true } },
      tournament: { select: { name: true } },
    },
  });

  if (!match) notFound();

  const user = await getCurrentUser();

  return (
    <WatchPageClient
      initialMatch={{ ...match, startedAt: match.startedAt?.toISOString() ?? null }}
      isPremium={isPremium(user)}
    />
  );
}
