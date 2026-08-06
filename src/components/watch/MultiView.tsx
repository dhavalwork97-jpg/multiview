"use client";

import { HlsPlayer } from "./HlsPlayer";
import { cdnUrl } from "@/lib/cdn";

type MultiViewStation = { id: string; label: string; hlsPlaylistKey: string | null };

// Multi-view is HLS-only, deliberately — 9 simultaneous WebRTC
// subscriptions is 9x the SFU load per viewer, which is exactly the
// scaling problem the HLS-default decision in STREAMING_ARCHITECTURE.md
// exists to avoid. All streams muted except one at a time (audio from 9
// matches at once isn't useful anyway); click a tile to make it the
// audio focus.
export function MultiView({
  stations,
  layout,
}: {
  stations: MultiViewStation[];
  layout: 4 | 9;
}) {
  const cols = layout === 4 ? 2 : 3;
  const visible = stations.slice(0, layout);

  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {visible.map((s, i) =>
        s.hlsPlaylistKey ? (
          <div key={s.id} className="relative">
            <HlsPlayer src={cdnUrl(s.hlsPlaylistKey)} muted={i !== 0} />
            <span className="absolute left-2 top-2 rounded bg-arena-950/80 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-muted">
              {s.label}
            </span>
          </div>
        ) : (
          <div key={s.id} className="flex aspect-video items-center justify-center rounded-card bg-arena-900 text-xs text-ink-faint">
            {s.label} — offline
          </div>
        )
      )}
    </div>
  );
}
