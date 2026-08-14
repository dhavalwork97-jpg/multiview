"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import { ClipControls } from "@/components/watch/ClipControls";

type InitialMatch = {
  id: string;
  round: string | null;
  status: string;
  playerOneScore: number;
  playerTwoScore: number;
  tournamentId: string;
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
  station: { id: string; label: string } | null;
  tournament: { name: string };
  startedAt: string | null;
  youtubeVideoId: string | null;
};

export function WatchPageClient({
  initialMatch,
  isPremium,
}: {
  initialMatch: InitialMatch;
  isPremium: boolean;
}) {
  const [match, setMatch] = useState(initialMatch);
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const socket = useSocket({ matchId: initialMatch.id });

  useEffect(() => {
    void fetch("/api/analytics/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId: initialMatch.id }) }).catch(() => {});
    let lastSent = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const seconds = Math.floor((now - lastSent) / 1000);
      if (seconds > 0) {
        lastSent = now;
        void fetch("/api/analytics/watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId: initialMatch.id, seconds }) }).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [initialMatch.id]);

  useEffect(() => {
    if (!match.startedAt) return;
    const startedAt = new Date(match.startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match.startedAt]);

  useEffect(() => {
    function handleUpdate(event: {
      matchId: string;
      status: string;
      playerOneScore: number;
      playerTwoScore: number;
    }) {
      if (event.matchId !== initialMatch.id) return;
      setMatch((prev) => ({
        ...prev,
        status: event.status,
        playerOneScore: event.playerOneScore,
        playerTwoScore: event.playerTwoScore,
      }));
    }

    function handleViewerCount(event: { matchId: string; count: number }) {
      if (event.matchId === initialMatch.id) setViewerCount(event.count);
    }

    socket.on("match:updated", handleUpdate);
    socket.on("viewer:count", handleViewerCount);
    return () => {
      socket.off("match:updated", handleUpdate);
      socket.off("viewer:count", handleViewerCount);
    };
  }, [socket, initialMatch.id]);

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
        {match.tournament.name} {match.round && `· ${match.round}`}
      </p>

      {/* Real player: HLS by default (scales), WebRTC opt-in (low latency) */}
      <div className="my-4 max-w-4xl">
        {match.status === "LIVE" && match.station ? (
          <VideoPlayer
            stationId={match.station.id}
            youtubeVideoId={match.youtubeVideoId}
            isPremium={isPremium}
            isLive
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-card bg-arena-900 text-sm text-ink-muted">
            {match.station ? (match.status === "COMPLETED" ? "Stream ended" : "Waiting for stream") : "Not yet assigned to a station"}
          </div>
        )}
      </div>

      <div className="flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="border-l-2 border-corner-p1 pl-3 font-display text-2xl uppercase tracking-wide">
            {match.playerOne.gamertag}
          </span>
          <span className="font-mono text-3xl">
            {match.playerOneScore}–{match.playerTwoScore}
          </span>
          <span className="border-r-2 border-corner-p2 pr-3 font-display text-2xl uppercase tracking-wide">
            {match.playerTwo.gamertag}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-ink-muted">
          {match.status === "LIVE" && (
            <span className="flex items-center gap-1.5 text-signal-live">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />
              LIVE
            </span>
          )}
          {viewerCount !== null && <span className="font-mono">{viewerCount} watching</span>}
          {match.station && <span>{match.station.label}</span>}
        </div>
      </div>

      <div className="mt-3 max-w-4xl">
        <ClipControls matchId={match.id} elapsedSeconds={elapsedSeconds} />
      </div>
    </main>
  );
}
