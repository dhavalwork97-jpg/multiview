"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

// Default viewing path — CloudFront-cached HLS scales to any audience
// size the way a per-viewer WebRTC subscription can't. A few seconds of
// latency in exchange for that scale is the trade described in
// STREAMING_ARCHITECTURE.md.
export function HlsPlayer({ src, muted = false }: { src: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Keep enough back-buffer that scrubbing backward within the
        // live playlist (DVR-style "watch from a bit ago") works,
        // without holding the entire match in memory.
        backBufferLength: 60 * 30,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    // Safari supports HLS natively — no hls.js needed there.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      controls
      className="aspect-video w-full rounded-card bg-arena-900"
    />
  );
}
