import Link from "next/link";
import { YouTubePlayer } from "@/components/watch/YouTubePlayer";

export type MatchCardData = {
  id: string;
  round: string | null;
  status: "QUEUED" | "LIVE" | "COMPLETED" | "DISPUTED";
  playerOneScore: number;
  playerTwoScore: number;
  hypeScore: number | null;
  youtubeVideoId?: string | null;
  playerOne: { gamertag: string } | null;
  playerTwo: { gamertag: string } | null;
  station: { id: string; label: string } | null;
};

export function MatchCard({ match }: { match: MatchCardData }) {
  const isHype = (match.hypeScore ?? 0) >= 70;

  return (
    <Link
      href={`/watch/${match.id}`}
      className="group relative flex flex-col overflow-hidden rounded-card bg-arena-800 bezel-cut ring-1 ring-arena-600 transition hover:ring-ink-faint"
    >
      {/* station label + live indicator */}
      <div className="flex items-center justify-between px-3 py-2 text-xs font-mono text-ink-muted">
        <span>{match.station?.label ?? "Unassigned"}</span>
        {match.status === "LIVE" && (
          <span className="flex items-center gap-1.5 text-signal-live">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />
            LIVE
          </span>
        )}
      </div>

      {match.status === "LIVE" ? (
        <YouTubePlayer
          stationId={match.station?.id ?? ""}
          videoId={match.youtubeVideoId ?? null}
          isLive
          muted
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-arena-900 text-xs font-mono uppercase tracking-wide text-ink-faint">
          {match.status === "QUEUED" ? "Waiting for stream" : "Stream ended"}
        </div>
      )}

      {/* player row */}
      <div className="flex items-stretch text-sm">
        <div className="flex flex-1 items-center gap-2 border-l-2 border-corner-p1 px-3 py-2">
          <span className="truncate font-display text-base uppercase tracking-wide">
  {match.playerOne?.gamertag ?? "TBD"}
</span>
        </div>
        <div className="flex items-center px-2 font-mono text-base text-ink">
          {match.playerOneScore}–{match.playerTwoScore}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 border-r-2 border-corner-p2 px-3 py-2">
          <span className="truncate font-display text-base uppercase tracking-wide">
  {match.playerTwo?.gamertag ?? "TBD"}
</span>
        </div>
      </div>

      {match.round && (
        <div className="border-t border-arena-600 px-3 py-1.5 text-xs text-ink-faint">
          {match.round}
        </div>
      )}

      {isHype && (
        <div className="absolute right-2 top-9 rounded bg-signal-warn/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-arena-950">
          Hype
        </div>
      )}
    </Link>
  );
}
