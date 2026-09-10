"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import { ClipControls } from "@/components/watch/ClipControls";
import { LivePresenceBar } from "@/components/social/LivePresenceBar";
import { ReactionTray } from "@/components/social/ReactionTray";
import { FloatingReactionCanvas } from "@/components/social/FloatingReactionCanvas";
import { MatchPulseCard } from "@/components/social/MatchPulseCard";
import { LiveActivityFeed } from "@/components/social/LiveActivityFeed";
import { WatchPartyPanel } from "@/components/social/WatchPartyPanel";
import { ChatPanel } from "@/components/social/ChatPanel";
import { CommunityEngagementPanel } from "@/components/social/CommunityEngagementPanel";
import { useActivityFeed, usePresence, usePulse, useReactionStream } from "@/hooks/useSocial";

type InitialMatch = { id: string; round: string | null; status: string; playerOneScore: number; playerTwoScore: number; tournamentId: string; playerOne: { id: string; gamertag: string }; playerTwo: { id: string; gamertag: string }; station: { id: string; label: string } | null; tournament: { name: string }; startedAt: string | null; youtubeVideoId: string | null; hlsPlaylistKey: string | null };

export function WatchPageClient({ initialMatch, isPremium }: { initialMatch: InitialMatch; isPremium: boolean }) {
  const [match, setMatch] = useState(initialMatch);
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const socket = useSocket({ matchId: initialMatch.id });
  const presence = usePresence(initialMatch.id);
  const { reactions, send } = useReactionStream(initialMatch.id);
  const pulse = usePulse(initialMatch.id);
  const activity = useActivityFeed(initialMatch.id);

  useEffect(() => {
    const key = "fgc_viewer_session";
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(key, sessionId);
    }
    const headers = { "Content-Type": "application/json", "x-viewer-session": sessionId };
    void fetch("/api/analytics/view", { method: "POST", headers, body: JSON.stringify({ matchId: initialMatch.id }) }).catch(() => {});
    let lastSent = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const seconds = Math.floor((now - lastSent) / 1000);
      if (seconds > 0) {
        lastSent = now;
        void fetch("/api/analytics/watch", { method: "POST", headers, body: JSON.stringify({ matchId: initialMatch.id, seconds }) }).catch(() => {});
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
    setConnected(socket.connected);
    function handleConnect() { setConnected(true); setLastUpdateAt(Date.now()); }
    function handleDisconnect() { setConnected(false); }
    function handleUpdate(event: { matchId: string; status: string; playerOneScore: number; playerTwoScore: number }) {
      if (event.matchId !== initialMatch.id) return;
      setMatch((prev) => ({ ...prev, status: event.status, playerOneScore: event.playerOneScore, playerTwoScore: event.playerTwoScore }));
      setLastUpdateAt(Date.now());
    }
    function handleViewerCount(event: { matchId: string; count: number }) {
      if (event.matchId === initialMatch.id) { setViewerCount(event.count); setLastUpdateAt(Date.now()); }
    }
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("match:updated", handleUpdate);
    socket.on("viewer:count", handleViewerCount);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("match:updated", handleUpdate);
      socket.off("viewer:count", handleViewerCount);
    };
  }, [socket, initialMatch.id]);

  const hasHlsVod = match.status === "COMPLETED" && Boolean(match.hlsPlaylistKey);
  const canPlayStream = Boolean(match.station) && (match.status === "LIVE" || hasHlsVod);
  const viewers = presence || viewerCount || 0;
  const matchLabel = match.status === "LIVE" ? "LIVE NOW" : match.status === "COMPLETED" ? "REPLAY" : "UP NEXT";

  return (
    <main className="page-shell relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_20%_10%,rgba(111,60,255,.18),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(32,217,255,.10),transparent_34%)]" />
      <div className="page-container relative max-w-[1320px] pb-12">
        <header className="mb-5 pt-2 sm:pt-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="page-kicker">{match.tournament.name}</span>
                {match.round && <><span className="text-ink-muted">/</span><span className="page-kicker">{match.round}</span></>}
                <span className="status-live">{matchLabel}</span>
              </div>
              <h1 className="display-heading mt-3 text-4xl uppercase leading-[.92] tracking-[-.04em] sm:text-6xl">{match.playerOne.gamertag} <span className="fgc-gradient-text">vs</span> {match.playerTwo.gamertag}</h1>
              <p className="mt-3 max-w-2xl text-sm text-ink-secondary sm:text-base">The arena feed, live score and community layer in one focused broadcast view.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <LivePresenceBar count={viewers} />
              {match.station && <span className="status-neutral">{match.station.label}</span>}
              <span className={connected ? "status-neutral" : "status-warning"}>{connected ? "LIVE SYNC" : "RECONNECTING"}</span>
            </div>
          </div>
          <nav aria-label="Match navigation" className="context-tabs mt-5">
            <Link href={`/tournaments/${match.tournamentId}`} className="context-tab">Tournament</Link>
            <Link href={`/tournaments/${match.tournamentId}/standings`} className="context-tab">Standings</Link>
            <Link href={`/tournaments/${match.tournamentId}/community`} className="context-tab">Community</Link>
            <Link href={`/multiview?tournamentId=${match.tournamentId}`} className="context-tab">Multi-View</Link>
            <span className="context-tab context-tab-active" aria-current="page">Watch</span>
          </nav>
        </header>

        <WatchPartyPanel matchId={match.id}>
          <section className="surface-card fgc-shimmer fgc-glow-violet relative overflow-hidden border-white/10 p-2 sm:p-3">
            <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-[#050916]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-white backdrop-blur-xl">
              <span className={`h-1.5 w-1.5 rounded-full ${match.status === "LIVE" ? "bg-[var(--fgc-cyan)] animate-live-pulse" : "bg-white/50"}`} />
              {matchLabel}
            </div>
            {canPlayStream ? <VideoPlayer stationId={match.station!.id} youtubeVideoId={match.youtubeVideoId} hlsPlaylistKey={match.hlsPlaylistKey} isPremium={isPremium} isLive={match.status === "LIVE"} /> : <div className="flex aspect-video w-full items-center justify-center rounded-card bg-[radial-gradient(circle_at_center,rgba(111,60,255,.16),transparent_42%),#040816] text-sm text-ink-muted">{match.station ? (match.status === "COMPLETED" ? "Recording unavailable" : "Waiting for stream") : "Not yet assigned to a station"}</div>}
            <FloatingReactionCanvas reactions={reactions} />
          </section>
        </WatchPartyPanel>

        <section className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="surface-card overflow-hidden p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div><p className="page-kicker">MATCH CONTROL</p><p className="mt-1 text-xs text-ink-muted">{lastUpdateAt ? `Updated ${new Date(lastUpdateAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Awaiting live telemetry"}</p></div>
              <span className="font-mono text-xs uppercase tracking-[.18em] text-ink-muted">{match.station?.label ?? "NO STATION"}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
              <div className="min-w-0 border-l-2 border-[var(--fgc-violet-bright)] pl-3 sm:pl-5"><p className="truncate font-display text-xl uppercase tracking-wide sm:text-3xl">{match.playerOne.gamertag}</p><p className="page-kicker mt-1">SIDE A</p></div>
              <div className="text-center"><span className="font-mono text-4xl font-bold tabular-nums tracking-[-.06em] sm:text-6xl">{match.playerOneScore}<span className="mx-1 text-ink-muted">:</span>{match.playerTwoScore}</span><p className="mt-1 font-mono text-[10px] uppercase tracking-[.2em] text-ink-muted">LIVE SCORE</p></div>
              <div className="min-w-0 border-r-2 border-[var(--fgc-cyan)] pr-3 text-right sm:pr-5"><p className="truncate font-display text-xl uppercase tracking-wide sm:text-3xl">{match.playerTwo.gamertag}</p><p className="page-kicker mt-1">SIDE B</p></div>
            </div>
          </section>
          <ChatPanel matchId={match.id} />
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-3">
            <div className="sticky bottom-3 z-10 sm:static"><ReactionTray onReact={(reaction) => void send(reaction)} /></div>
            <ClipControls matchId={match.id} elapsedSeconds={elapsedSeconds} />
          </div>
          <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <MatchPulseCard score={pulse.score} reactions={pulse.reactions} />
            <LiveActivityFeed events={activity} />
          </aside>
        </div>

        <section className="mt-6 border-t border-white/10 pt-6">
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="page-kicker">COMMUNITY LAYER</p><h2 className="font-display text-2xl uppercase tracking-wide">Make the match louder.</h2></div><span className="hidden font-mono text-[10px] uppercase tracking-[.2em] text-ink-muted sm:block">FGC / LIVE / {match.id.slice(0, 8)}</span></div>
          <CommunityEngagementPanel matchId={match.id} tournamentId={match.tournamentId} playerOne={match.playerOne} playerTwo={match.playerTwo} />
        </section>
      </div>
    </main>
  );
}
