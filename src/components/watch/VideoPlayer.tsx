"use client";

import { HlsPlayer } from "./HlsPlayer";
import { LiveKitPlayer } from "./LiveKitPlayer";
import { YouTubePlayer } from "./YouTubePlayer";

function publicHlsUrl(storageKey: string) {
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
  if (!storageUrl || !bucket) return null;

  const base = storageUrl.replace(/\/$/, "");
  const storageBase = /\/storage\/v1$/.test(base) ? base : `${base}/storage/v1`;
  const normalizedKey = storageKey.replace(/^\/+/, "");
  return `${storageBase}/object/public/${encodeURIComponent(bucket)}/${normalizedKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function VideoPlayer({
  stationId,
  youtubeVideoId,
  hlsPlaylistKey,
  isLive,
  isPremium = false,
}: {
  stationId: string;
  youtubeVideoId: string | null;
  hlsPlaylistKey?: string | null;
  isLive: boolean;
  isPremium?: boolean;
}) {
  const hlsSrc = hlsPlaylistKey ? publicHlsUrl(hlsPlaylistKey) : null;

  // Premium viewers get the lowest-latency path when LiveKit is configured.
  // This remains a live-only optimization; completed matches are served from
  // the persisted HLS playlist in Supabase Storage.
  if (isLive && isPremium && process.env.NEXT_PUBLIC_LIVEKIT_PLAYBACK === "true") {
    return <LiveKitPlayer stationId={stationId} />;
  }

  // HLS is the canonical persisted media path for both live playback and
  // completed-match VOD. Fall back to YouTube only when no HLS playlist is
  // available (for example, an older match recorded before HLS migration).
  if (hlsSrc) return <HlsPlayer src={hlsSrc} isLive={isLive} />;
  return <YouTubePlayer stationId={stationId} videoId={youtubeVideoId} isLive={isLive} />;
}
