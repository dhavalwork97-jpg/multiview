"use client";

import { useMemo, useState } from "react";
import { HlsPlayer } from "@/components/watch/HlsPlayer";
import { YouTubePlayer } from "@/components/watch/YouTubePlayer";

type Station = {
  id: string;
  label: string;
  status: string;
  playbackIdHls: string | null;
  youtubeVideoId: string | null;
  bitrate: number | null;
  droppedFrames: number | null;
  match: {
    id: string;
    round: string | null;
    status: string;
    playerOne: string | null;
    playerTwo: string | null;
    playerOneScore: number;
    playerTwoScore: number;
  } | null;
};

type Layout = "grid" | "focus" | "health";

function hlsUrl(key: string | null) {
  if (!key) return null;
  const domain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return domain ? `https://${domain}/${key.replace(/^\/+/, "")}` : null;
}

function statusClass(status: string) {
  const value = status.toUpperCase();
  if (value === "LIVE") return "text-cyan-200 border-cyan-300/25 bg-cyan-300/[.07]";
  if (value === "ERROR") return "text-rose-200 border-rose-300/25 bg-rose-300/[.07]";
  return "text-white/45 border-white/10 bg-white/[.03]";
}

function Feed({ station, muted, large = false }: { station: Station; muted: boolean; large?: boolean }) {
  const src = hlsUrl(station.playbackIdHls);
  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${large ? "aspect-video" : "aspect-video"}`}>
      {src ? <HlsPlayer src={src} muted={muted} /> : station.youtubeVideoId ? <YouTubePlayer stationId={station.id} videoId={station.youtubeVideoId} isLive muted={muted} /> : <div className="flex h-full items-center justify-center text-xs text-white/30">No video signal</div>}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-3">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[.18em] text-white">{station.label}</span>
        <span className={`rounded-full border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[.12em] ${statusClass(station.status)}`}>{station.status}</span>
      </div>
    </div>
  );
}

export default function OrganizerProductionMultiview({ stations }: { stations: Station[] }) {
  const [layout, setLayout] = useState<Layout>("grid");
  const [audio, setAudio] = useState(0);
  const [selected, setSelected] = useState(0);
  const visible = stations.slice(0, 9);
  const selectedStation = visible[selected] ?? visible[0];
  const liveCount = useMemo(() => visible.filter((s) => s.status === "LIVE").length, [visible]);
  const errorCount = useMemo(() => visible.filter((s) => s.status === "ERROR").length, [visible]);

  if (!visible.length) {
    return <div className="rounded-2xl border border-white/10 bg-white/[.03] px-6 py-16 text-center text-sm text-white/35">No stations are configured for this event yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[.07] px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[.14em] text-cyan-200">{liveCount} live</span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[.14em] text-white/40">{visible.length} stations</span>
          {errorCount > 0 && <span className="rounded-full border border-rose-300/25 bg-rose-300/[.07] px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[.14em] text-rose-200">{errorCount} issue{errorCount === 1 ? "" : "s"}</span>}
        </div>
        <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
          {(["grid", "focus", "health"] as Layout[]).map((item) => <button key={item} type="button" onClick={() => setLayout(item)} className={`rounded-md px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[.12em] transition ${layout === item ? "bg-white text-black" : "text-white/40 hover:text-white"}`}>{item === "grid" ? "Production" : item === "focus" ? "Focus" : "Health"}</button>)}
        </div>
      </div>

      {layout === "focus" && selectedStation ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black p-2"><Feed station={selectedStation} muted={audio !== selected} large /></div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="font-mono text-[8px] uppercase tracking-[.15em] text-white/25">Match</p><p className="mt-2 font-semibold text-white">{selectedStation.match?.round ?? "No match assigned"}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="font-mono text-[8px] uppercase tracking-[.15em] text-white/25">Score</p><p className="mt-2 font-display text-2xl font-bold text-white">{selectedStation.match ? `${selectedStation.match.playerOneScore} — ${selectedStation.match.playerTwoScore}` : "—"}</p></div>
              <button type="button" onClick={() => setAudio(selected)} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] p-4 text-left"><p className="font-mono text-[8px] uppercase tracking-[.15em] text-cyan-200/50">Audio</p><p className="mt-2 text-sm font-semibold text-white">{audio === selected ? "Focused" : "Focus this station"}</p></button>
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[.025] p-3">
            <p className="px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[.16em] text-white/30">Stations</p>
            {visible.map((station, index) => <button key={station.id} type="button" onClick={() => setSelected(index)} className={`w-full rounded-xl border p-3 text-left transition ${selected === index ? "border-cyan-300/30 bg-cyan-300/[.06]" : "border-white/[.07] bg-black/20 hover:border-white/15"}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold text-white/80">{station.label}</span><span className="font-mono text-[7px] uppercase tracking-[.12em] text-white/30">{station.status}</span></div><p className="mt-1 truncate text-xs text-white/35">{station.match ? `${station.match.playerOne ?? "TBD"} vs ${station.match.playerTwo ?? "TBD"}` : "No match assigned"}</p></button>)}
          </div>
        </div>
      ) : layout === "health" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((station) => <article key={station.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold uppercase text-white">{station.label}</p><p className="font-mono text-[8px] uppercase tracking-[.12em] text-white/25">{station.match?.round ?? "Unassigned"}</p></div><span className={`rounded-full border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[.1em] ${statusClass(station.status)}`}>{station.status}</span></div><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-lg bg-black/20 p-3"><p className="font-mono text-[7px] uppercase tracking-[.12em] text-white/25">Bitrate</p><p className="mt-1 font-semibold text-white">{station.bitrate ? `${station.bitrate} kbps` : "—"}</p></div><div className="rounded-lg bg-black/20 p-3"><p className="font-mono text-[7px] uppercase tracking-[.12em] text-white/25">Dropped</p><p className="mt-1 font-semibold text-white">{station.droppedFrames ?? 0}</p></div></div></article>)}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((station, index) => <article key={station.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30"><button type="button" onClick={() => { setSelected(index); setLayout("focus"); }} className="block w-full text-left"><Feed station={station} muted={audio !== index} /></button><div className="border-t border-white/[.07] bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white/80">{station.match?.playerOne ?? "TBD"} <span className="text-white/20">vs</span> {station.match?.playerTwo ?? "TBD"}</p><p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[.12em] text-white/25">{station.match?.round ?? "No match assigned"}</p></div><button type="button" onClick={() => setAudio(index)} className={`shrink-0 rounded-lg px-2 py-1.5 font-mono text-[7px] font-bold uppercase tracking-[.1em] ${audio === index ? "bg-cyan-300 text-black" : "border border-white/10 text-white/35"}`}>{audio === index ? "Audio" : "Focus"}</button></div><div className="mt-2 flex items-center justify-between font-mono text-[8px] text-white/25"><span>Score {station.match ? `${station.match.playerOneScore} — ${station.match.playerTwoScore}` : "—"}</span><span>{station.status}</span></div></div></article>)}
        </div>
      )}
    </div>
  );
}
