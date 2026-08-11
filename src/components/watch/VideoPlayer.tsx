"use client";

import { useEffect, useState } from "react";
import { HlsPlayer } from "./HlsPlayer";
import { LiveKitPlayer } from "./LiveKitPlayer";
import { cdnUrl } from "@/lib/cdn";

export function VideoPlayer({
  stationId,
  hlsPlaylistKey,
  isPremium,
  isLive,
}: {
  stationId: string;
  hlsPlaylistKey: string | null;
  isPremium: boolean;
  isLive: boolean;
}) {
  const [mode, setMode] = useState<"hls" | "webrtc">("hls");

  // If the match becomes LIVE before egress has produced its first HLS
  // playlist, immediately use the LiveKit room instead of leaving the
  // viewer stuck on "Stream starting…". This is the important startup
  // fallback: OBS -> LiveKit can be ready before HLS egress is ready.
  useEffect(() => {
    if (isLive && !hlsPlaylistKey) setMode("webrtc");
    if (!isLive) setMode("hls");
  }, [isLive, hlsPlaylistKey]);

  // Once a real HLS source exists, use it by default unless the viewer
  // explicitly selected low-latency mode. If HLS is absent while LIVE,
  // WebRTC is always allowed as the emergency live path so the public
  // page never displays a dead player simply because egress is late.
  const effectiveMode = mode === "webrtc" || (isLive && !hlsPlaylistKey) ? "webrtc" : "hls";

  return (
    <div>
      {effectiveMode === "hls" && hlsPlaylistKey ? (
        <HlsPlayer src={cdnUrl(`${hlsPlaylistKey}/index.m3u8`)} />
      ) : effectiveMode === "webrtc" && isLive ? (
        <LiveKitPlayer stationId={stationId} />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-card bg-arena-900 text-sm text-ink-muted">
          {isLive ? "Connecting to live stream…" : "Stream starting…"}
        </div>
      )}

      {isPremium ? (
        <button
          type="button"
          onClick={() => setMode(mode === "hls" ? "webrtc" : "hls")}
          disabled={!isLive}
          className="mt-2 rounded border border-arena-600 px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "hls" ? "Switch to low-latency (WebRTC)" : "Switch to standard (HLS)"}
        </button>
      ) : (
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
          {isLive && !hlsPlaylistKey ? "LiveKit low-latency fallback active" : "Low-latency mode is a Premium feature"}
        </p>
      )}
    </div>
  );
}
