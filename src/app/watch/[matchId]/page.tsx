import { connection } from "next/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPremium } from "@/lib/billing";
import { WatchPageClient } from "./WatchPageClient";

// Match existence is resolved at request time because match records are
// mutable/live data. Explicitly opt into dynamic rendering so an unknown
// match can never be satisfied by a stale/static route result.
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

// Video playback (WebRTC low-latency path + HLS fallback, adaptive
// bitrate, DVR) is Phase 3 scope. This page exists now so every
// click-through added in Phase 2 — the live grid, the bracket, search —
// has a real destination and the live match state (score, status, viewer
// count) is already wired end-to-end over Socket.IO.
export default async function WatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  await connection();
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
      youtubeVideoId: true,
      playerOne: { select: { gamertag: true } },
      playerTwo: { select: { gamertag: true } },
      sides: { include: { participants: { include: { player: { select: { gamertag: true } }, team: { select: { name: true } } } } } },
      station: { select: { id: true, label: true, playbackIdHls: true } },
      tournament: { select: { name: true } },
    },
  });

  if (!match) notFound();

  const user = await getCurrentUser();

  const sideA = match.sides.find((side) => side.sideKey === "A");
  const sideB = match.sides.find((side) => side.sideKey === "B");
  const nameFor = (side: typeof sideA, fallback: string) =>
    side?.participants.map((p) => p.player?.gamertag ?? p.team?.name ?? p.displayName).filter(Boolean).join(" / ") || fallback;

  return (
    <WatchPageClient
      initialMatch={{
        ...match,
        playerOne: { gamertag: nameFor(sideA, match.playerOne?.gamertag ?? "Side A") },
        playerTwo: { gamertag: nameFor(sideB, match.playerTwo?.gamertag ?? "Side B") },
        startedAt: match.startedAt?.toISOString() ?? null,
        hlsPlaylistKey: match.station?.playbackIdHls ? `${match.station.playbackIdHls}/index.m3u8` : null,
      }}
      isPremium={isPremium(user)}
    />
  );
}
