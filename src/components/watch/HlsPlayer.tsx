"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export function HlsPlayer({
  src,
  muted = false,
  autoPlay = true,
  className = "",
}: {
  src: string;
  muted?: boolean;
  autoPlay?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;
    setError(false);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
          else setError(true);
        }
      });
    } else {
      setError(true);
    }

    return () => {
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-card bg-arena-900 ${className}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        controls
        className="h-full w-full object-contain"
        onError={() => setError(true)}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-arena-950/90 px-4 text-center text-xs text-ink-muted">
          Live stream playback is temporarily unavailable. Please retry in a moment.
        </div>
      )}
    </div>
  );
}
