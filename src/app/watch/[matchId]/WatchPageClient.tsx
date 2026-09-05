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
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useActivityFeed, usePresence, usePulse, useReactionStream } from "@/hooks/useSocial";

type InitialMatch = { id: string; round: string | null; status: string; playerOneScore: number; playerTwoScore: number; tournamentId: string; playerOne: { id: string; gamertag: string }; playerTwo: { id: string; gamertag: string }; station: { id: string; label: string } | null; tournament: { name: string }; startedAt: string | null; youtubeVideoId: string | null; hlsPlaylistKey: string | null };

export function WatchPageClient({ initialMatch, isPremium }: { initialMatch: InitialMatch; isPremium: boolean }) {
  const [match, setMatch] = useState(initialMatch); const [viewerCount, setViewerCount] = useState<number | null>(null); const [elapsedSeconds, setElapsedSeconds] = useState(0); const [connected, setConnected] = useState(false); const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const socket = useSocket({ matchId: initialMatch.id }); const presence = usePresence(initialMatch.id); const { reactions, send } = useReactionStream(initialMatch.id); const pulse = usePulse(initialMatch.id); const activity = useActivityFeed(initialMatch.id);
  useEffect(()=>{const key="fgc_viewer_session";let sessionId=sessionStorage.getItem(key);if(!sessionId){sessionId=typeof crypto?.randomUUID==="function"?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem(key,sessionId);}const headers={"Content-Type":"application/json","x-viewer-session":sessionId};void fetch("/api/analytics/view",{method:"POST",headers,body:JSON.stringify({matchId:initialMatch.id})}).catch(()=>{});let lastSent=Date.now();const interval=setInterval(()=>{const now=Date.now();const seconds=Math.floor((now-lastSent)/1000);if(seconds>0){lastSent=now;void fetch("/api/analytics/watch",{method:"POST",headers,body:JSON.stringify({matchId:initialMatch.id,seconds})}).catch(()=>{});}},30000);return()=>clearInterval(interval);},[initialMatch.id]);
  useEffect(()=>{if(!match.startedAt)return;const startedAt=new Date(match.startedAt).getTime();const tick=()=>setElapsedSeconds(Math.max(0,Math.floor((Date.now()-startedAt)/1000)));tick();const interval=setInterval(tick,1000);return()=>clearInterval(interval);},[match.startedAt]);
  useEffect(()=>{setConnected(socket.connected);function handleConnect(){setConnected(true);setLastUpdateAt(Date.now());}function handleDisconnect(){setConnected(false);}function handleUpdate(event:{matchId:string;status:string;playerOneScore:number;playerTwoScore:number}){if(event.matchId!==initialMatch.id)return;setMatch(prev=>({...prev,status:event.status,playerOneScore:event.playerOneScore,playerTwoScore:event.playerTwoScore}));setLastUpdateAt(Date.now());}function handleViewerCount(event:{matchId:string;count:number}){if(event.matchId===initialMatch.id){setViewerCount(event.count);setLastUpdateAt(Date.now());}}socket.on("connect",handleConnect);socket.on("disconnect",handleDisconnect);socket.on("match:updated",handleUpdate);socket.on("viewer:count",handleViewerCount);return()=>{socket.off("connect",handleConnect);socket.off("disconnect",handleDisconnect);socket.off("match:updated",handleUpdate);socket.off("viewer:count",handleViewerCount);};},[socket,initialMatch.id]);
  const isLive = match.status === "LIVE";
  const viewers = presence || viewerCount || 0;
  return <main className="page-shell"><div className="page-container max-w-6xl">
    <header className="mb-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">{isLive ? <LiveBadge /> : <span className="status-neutral">{match.status}</span>}{match.round && <span className="page-kicker">{match.round}</span>}{match.station && <span className="status-neutral">{match.station.label}</span>}</div>
          <p className="page-kicker mt-3 truncate">{match.tournament.name}</p>
          <h1 className="page-title mt-1 text-4xl sm:text-5xl">{match.playerOne.gamertag} <span className="text-ink-faint">vs</span> {match.playerTwo.gamertag}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[23rem]" aria-live="polite"><div className="surface-quiet px-3 py-2"><p className="metric-label">Score</p><p className="metric-value mt-1">{match.playerOneScore}–{match.playerTwoScore}</p></div><div className="surface-quiet px-3 py-2"><p className="metric-label">Watching</p><p className="metric-value mt-1">{viewers}</p></div><div className="surface-quiet col-span-2 px-3 py-2 sm:col-span-1"><p className="metric-label">Connection</p><p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${connected ? "text-signal-live" : "text-corner-p2"}`}>{connected ? "Live" : "Reconnecting"}</p></div></div>
      </div>
      {!connected&&<div role="status" className="mt-3 rounded-card border border-corner-p2/30 bg-corner-p2/10 px-3 py-2 text-sm text-ink-secondary">The stream can continue while live score updates reconnect. We’ll resume live updates automatically.</div>}
      <nav aria-label="Match navigation" className="context-tabs mt-4 overflow-x-auto"><Link href={`/tournaments/${match.tournamentId}`} className="context-tab">Tournament</Link><Link href={`/tournaments/${match.tournamentId}/standings`} className="context-tab">Standings</Link><Link href={`/tournaments/${match.tournamentId}/community`} className="context-tab">Community</Link><Link href={`/multiview?tournamentId=${match.tournamentId}`} className="context-tab">Multi-View</Link><span className="context-tab context-tab-active" aria-current="page">Match</span></nav>
    </header>

    <WatchPartyPanel matchId={match.id}><section className="surface-card relative overflow-hidden p-2 sm:p-3"><div className="mb-2 flex items-center justify-between gap-3 px-1 sm:px-2"><div className="flex items-center gap-2">{isLive&&<LiveBadge/>}<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{match.station?.label ?? "Broadcast"}</span></div><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{match.round ?? "Match"}</span></div><div className="relative">{isLive&&match.station?<VideoPlayer stationId={match.station.id} youtubeVideoId={match.youtubeVideoId} hlsPlaylistKey={match.hlsPlaylistKey} isPremium={isPremium} isLive/>:<div className="flex aspect-video w-full items-center justify-center rounded-card bg-arena-950 text-sm text-ink-muted">{match.station?(match.status==="COMPLETED"?"Stream ended":"Waiting for stream"):"Not yet assigned to a station"}</div>}<FloatingReactionCanvas reactions={reactions}/></div></section></WatchPartyPanel>

    <section className="mt-3 grid gap-3 lg:grid-cols-[1fr_22rem]"><section className="surface-card p-4 sm:p-6"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6"><div className="min-w-0 border-l-2 border-corner-p1 pl-3"><p className="truncate font-display text-xl uppercase tracking-wide sm:text-3xl">{match.playerOne.gamertag}</p><p className="page-kicker mt-1">Side A</p></div><div className="text-center"><span className="font-mono text-4xl font-bold tabular-nums sm:text-6xl">{match.playerOneScore}–{match.playerTwoScore}</span><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">{isLive ? "Live score" : "Final score"}</p></div><div className="min-w-0 border-r-2 border-corner-p2 pr-3 text-right"><p className="truncate font-display text-xl uppercase tracking-wide sm:text-3xl">{match.playerTwo.gamertag}</p><p className="page-kicker mt-1">Side B</p></div></div></section><ChatPanel matchId={match.id}/></section>

    <section className="mt-6"><SectionHeader eyebrow="Broadcast community" title="React, clip, stay in the moment" description="Live reactions, match events, and chat keep the broadcast connected to the people watching it." /><div className="mt-3 grid gap-3 lg:grid-cols-[1fr_18rem]"><div className="space-y-3"><div className="sticky bottom-3 z-10 sm:static"><ReactionTray onReact={reaction=>void send(reaction)}/></div><ClipControls matchId={match.id} elapsedSeconds={elapsedSeconds}/></div><aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><MatchPulseCard score={pulse.score} reactions={pulse.reactions}/><LiveActivityFeed events={activity}/></aside></div></section>
    <section className="mt-6"><CommunityEngagementPanel matchId={match.id} tournamentId={match.tournamentId} playerOne={match.playerOne} playerTwo={match.playerTwo}/></section>
  </div></main>;
}
