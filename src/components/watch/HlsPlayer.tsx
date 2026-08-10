"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

// Default viewing path — CloudFront-cached HLS scales to any audience
// size the way a per-viewer WebRTC subscription can't. A few seconds of
// latency in exchange for that scale is the trade described in
// STREAMING_ARCHITECTURE.md.
export function HlsPlayer({ src, muted = false }: { src: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // "loading" until the first frame plays, then "playing" for good —
  // this only tracks whether a *fatal* failure has happened, not every
  // hls.js hiccup (it auto-recovers plenty of transient network/media
  // errors on its own; surfacing those to the viewer would just be noise).
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  // Bumping this remounts the effect below with a fresh Hls instance —
  // simplest reliable way to actually retry (vs. trying to resume a
  // fatally-errored hls.js instance in place).
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setStatus("loading");

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Keep enough back-buffer that scrubbing backward within the
        // live playlist (DVR-style "watch from a bit ago") works,
        // without holding the entire match in memory.
        backBufferLength: 60 * 30,
        liveSyncDurationCount: 3,
      });
      hls.on(Hls.Events.FRAG_LOADED, () => setStatus((s) => (s === "loading" ? "playing" : s)));
      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Previously nothing listened to this at all — a fatal error
        // (playlist 404 because egress hasn't produced a segment yet,
        // manifest load timeout, etc.) left the <video> element just
        // silently frozen with no indication anything was wrong.
        if (data.fatal) setStatus("error");
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    // Safari supports HLS natively — no hls.js needed there.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      const onPlaying = () => setStatus("playing");
      const onError = () => setStatus("error");
      video.addEventListener("playing", onPlaying);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
      };
    }
  }, [src, retryNonce]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card bg-arena-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        controls
        className="h-full w-full"
      />
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-arena-900/95 text-center text-sm text-signal-error">
          <p>Stream hiccup — playback failed.</p>
          <button
            type="button"
            onClick={() => setRetryNonce((n) => n + 1)}
            className="rounded-card border border-arena-600 px-3 py-1 font-mono text-xs uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-signal-live"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
