"use client";

import { HlsPlayer } from "./HlsPlayer";
import { LiveKitPlayer } from "./LiveKitPlayer";
import { YouTubePlayer } from "./YouTubePlayer";

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
  const cloudfront = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const hlsSrc = hlsPlaylistKey && cloudfront
    ? `https://${cloudfront}/${hlsPlaylistKey.replace(/^\/+/, "")}`
    : null;

  if (!isLive) return <YouTubePlayer stationId={stationId} videoId={youtubeVideoId} isLive={false} />;

  // Premium viewers get the lowest-latency path when LiveKit is configured.
  // Everyone else uses the scalable HLS path, falling back to YouTube when
  // an HLS recording has not been published yet.
  if (isPremium && process.env.NEXT_PUBLIC_LIVEKIT_PLAYBACK === "true") {
    return <LiveKitPlayer stationId={stationId} />;
  }
  if (hlsSrc) return <HlsPlayer src={hlsSrc} />;
  return <YouTubePlayer stationId={stationId} videoId={youtubeVideoId} isLive />;
}
