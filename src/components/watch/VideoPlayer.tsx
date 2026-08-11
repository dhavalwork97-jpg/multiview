"use client";

import { YouTubePlayer } from "./YouTubePlayer";

export function VideoPlayer({
  stationId,
  youtubeVideoId,
  isLive,
}: {
  stationId: string;
  youtubeVideoId: string | null;
  isLive: boolean;
  isPremium?: boolean;
  hlsPlaylistKey?: string | null;
}) {
  return <YouTubePlayer stationId={stationId} videoId={youtubeVideoId} isLive={isLive} />;
}
