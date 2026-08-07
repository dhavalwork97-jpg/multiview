"use client";

import { useState } from "react";
import { HlsPlayer } from "./HlsPlayer";
import { LiveKitPlayer } from "./LiveKitPlayer";
import { cdnUrl } from "@/lib/cdn";

export function VideoPlayer({
  stationId,
  hlsPlaylistKey,
  isPremium,
}: {
  stationId: string;
  hlsPlaylistKey: string | null;
  isPremium: boolean;
}) {
  const [mode, setMode] = useState<"hls" | "webrtc">("hls");

  return (
    <div>
      {mode === "hls" && hlsPlaylistKey ? (
        <HlsPlayer src={cdnUrl(`${hlsPlaylistKey}/index.m3u8`)} />
      ) : mode === "webrtc" ? (
        <LiveKitPlayer stationId={stationId} />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-card bg-arena-900 text-sm text-ink-muted">
          Stream starting…
        </div>
      )}

      {isPremium ? (
        <button
          type="button"
          onClick={() => setMode(mode === "hls" ? "webrtc" : "hls")}
          className="mt-2 rounded border border-arena-600 px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink-muted hover:text-ink"
        >
          {mode === "hls" ? "Switch to low-latency (WebRTC)" : "Switch to standard (HLS)"}
        </button>
      ) : (
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
          Low-latency mode is a Premium feature
        </p>
      )}
    </div>
  );
}
