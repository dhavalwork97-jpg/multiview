"use client";

/**
 * Pure YouTube renderer. The video id is match-scoped (or station-scoped for
 * the multi-view screen). Do not fetch the station's current video here: a
 * station can move from Match A to Match B while an old Match A page is still
 * open, and replacing A's id with B's would make the viewer see the wrong game.
 * All live-status truth comes from the app's match/station state.
 */
export function YouTubePlayer({
  stationId: _stationId,
  videoId,
  isLive,
  muted = false,
}: {
  stationId: string;
  videoId: string | null;
  isLive: boolean;
  muted?: boolean;
}) {
  if (videoId && isLive) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-card bg-arena-900">
        <iframe
          key={videoId}
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&playsinline=1`}
          title="FGC Stream live match"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-card bg-arena-900 text-sm text-ink-muted">
      {isLive ? "Connecting to live stream…" : "Not live yet"}
    </div>
  );
}
