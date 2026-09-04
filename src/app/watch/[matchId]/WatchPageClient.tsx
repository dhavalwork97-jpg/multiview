"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import { ClipControls } from "@/components/watch/ClipControls";

type InitialMatch = { id: string; round: string | null; status: string; playerOneScore: number; playerTwoScore: number; tournamentId: string; playerOne: { gamertag: string }; playerTwo: { gamertag: string }; station: { id: string; label: string } | null; tournament: { name: string }; startedAt: string | null; youtubeVideoId: string | null; hlsPlaylistKey: string | null };

export function WatchPageClient({ initialMatch, isPremium }: { initialMatch: InitialMatch; isPremium: boolean }) {
  const [match, setMatch] = useState(initialMatch);
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const socket = useSocket({ matchId: initialMatch.id });

  useEffect(() => {
    const key = "fgc_viewer_session";
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) { sessionId = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; sessionStorage.setItem(key, sessionId); }
    const headers = { "Content-Type": "application/json", "x-viewer-session": sessionId };
    void fetch("/api/analytics/view", { method: "POST", headers, body: JSON.stringify({ matchId: initialMatch.id }) }).catch(() => {});
    let lastSent = Date.now();
    const interval = setInterval(() => { const now = Date.now(); const seconds = Math.floor((now - lastSent) / 1000); if (seconds > 0) { lastSent = now; void fetch("/api/analytics/watch", { method: "POST", headers, body: JSON.stringify({ matchId: initialMatch.id, seconds }) }).catch(() => {}); } }, 30000);
    return () => clearInterval(interval);
  }, [initialMatch.id]);

  useEffect(() => {
    if (!match.startedAt) return;
    const startedAt = new Date(match.startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick(); const interval = setInterval(tick, 1000); return () => clearInterval(interval);
  }, [match.startedAt]);

  useEffect(() => {
    setConnected(socket.connected);
    function handleConnect() { setConnected(true); setLastUpdateAt(Date.now()); }
    function handleDisconnect() { setConnected(false); }
    function handleUpdate(event: { matchId: string; status: string; playerOneScore: number; playerTwoScore: number }) { if (event.matchId !== initialMatch.id) return; setMatch((prev) => ({ ...prev, status: event.status, playerOneScore: event.playerOneScore, playerTwoScore: event.playerTwoScore })); setLastUpdateAt(Date.now()); }
    function handleViewerCount(event: { matchId: string; count: number }) { if (event.matchId === initialMatch.id) { setViewerCount(event.count); setLastUpdateAt(Date.now()); } }
    socket.on("connect", handleConnect); socket.on("disconnect", handleDisconnect); socket.on("match:updated", handleUpdate); socket.on("viewer:count", handleViewerCount);
    return () => { socket.off("connect", handleConnect); socket.off("disconnect", handleDisconnect); socket.off("match:updated", handleUpdate); socket.off("viewer:count", handleViewerCount); };
  }, [socket, initialMatch.id]);

  return (
    <main className="page-shell">
      <div className="page-container max-w-6xl">
        <header className="mb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="page-kicker">{match.tournament.name}{match.round && ` · ${match.round}`}</p><h1 className="page-title mt-1 text-3xl sm:text-4xl">Watch match</h1></div>
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">{match.status === "LIVE" && <span className="status-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />LIVE</span>}{viewerCount !== null && <span className="status-neutral">{viewerCount} watching</span>}{match.station && <span className="status-neutral">{match.station.label}</span>}<span className={connected ? "status-neutral" : "status-warning"}>{connected ? "Live updates" : "Reconnecting…"}</span>{lastUpdateAt !== null && <span className="status-neutral hidden sm:inline">Updated {new Date(lastUpdateAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}</div>
          </div>
          {!connected && <div role="status" className="mt-3 rounded-card border border-corner-p2/30 bg-corner-p2/10 px-3 py-2 text-sm text-ink-secondary">The stream can continue while live score updates reconnect. We’ll resume live updates automatically.</div>}
          <nav aria-label="Match navigation" className="context-tabs mt-4">
            <Link href={`/tournaments/${match.tournamentId}`} className="context-tab">Tournament</Link>
            <Link href={`/tournaments/${match.tournamentId}/standings`} className="context-tab">Standings</Link>
            <Link href={`/multiview?tournamentId=${match.tournamentId}`} className="context-tab">Multi-View</Link>
            <span className="context-tab context-tab-active" aria-current="page">Match</span>
          </nav>
        </header>

        <section className="surface-card overflow-hidden p-2 sm:p-3">
          {match.status === "LIVE" && match.station ? <VideoPlayer stationId={match.station.id} youtubeVideoId={match.youtubeVideoId} hlsPlaylistKey={match.hlsPlaylistKey} isPremium={isPremium} isLive /> : <div className="flex aspect-video w-full items-center justify-center rounded-card bg-arena-950 text-sm text-ink-muted">{match.station ? (match.status === "COMPLETED" ? "Stream ended" : "Waiting for stream") : "Not yet assigned to a station"}</div>}
        </section>

        <section className="surface-card mt-3 p-4 sm:p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div className="min-w-0 border-l-2 border-corner-p1 pl-3"><p className="truncate font-display text-xl uppercase tracking-wide sm:text-3xl">{match.playerOne.gamertag}</p><p className="page-kicker mt-1">Side A</p></div>
            <div className="text-center"><span className="font-mono text-3xl font-bold tabular-nums sm:text-5xl">{match.playerOneScore}–{match.playerTwoScore}</span></div>
            <div className="min-w-0 border-r-2 border-corner-p2 pr-3 text-right"><p className="truncate font-display text-xl uppercase tracking-wide sm:text-3xl">{match.playerTwo.gamertag}</p><p className="page-kicker mt-1">Side B</p></div>
          </div>
        </section>

        <div className="mt-3"><ClipControls matchId={match.id} elapsedSeconds={elapsedSeconds} /></div>
      </div>
    </main>
  );
}
