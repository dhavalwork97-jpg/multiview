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

const statusCopy: Record<MatchCardData["status"], string> = {
  LIVE: "ON AIR",
  QUEUED: "UP NEXT",
  COMPLETED: "FINAL",
  DISPUTED: "REVIEW",
};

export function MatchCard({ match }: { match: MatchCardData }) {
  const isHype = (match.hypeScore ?? 0) >= 70;
  const isLive = match.status === "LIVE";

  return (
    <Link
      href={`/watch/${match.id}`}
      className="group surface-card surface-card-interactive relative flex min-w-0 flex-col overflow-hidden rounded-[12px] focus-visible:outline-none"
    >
      <div className="relative aspect-video overflow-hidden bg-[#050817]">
        {isLive ? (
          <YouTubePlayer
            stationId={match.station?.id ?? ""}
            videoId={match.youtubeVideoId ?? null}
            isLive
            muted
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(111,60,255,.18),transparent_46%),linear-gradient(145deg,#0d1530,#050817)]">
            <div className="text-center">
              <div className="font-display text-4xl uppercase tracking-[.02em] text-ink/80">{statusCopy[match.status]}</div>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[.18em] text-ink-faint">
                {match.status === "QUEUED" ? "Waiting for broadcast" : "Broadcast unavailable"}
              </p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-3 pb-7 pt-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[.16em] text-white/75">
            {match.station?.label ?? "STATION UNASSIGNED"}
          </span>
          <span className={isLive ? "status-live" : "status-neutral"}>
            {isLive && <span className="live-dot animate-live-pulse" aria-hidden="true" />}
            {statusCopy[match.status]}
          </span>
        </div>
        {isHype && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full border border-signal-warn/40 bg-arena-950/85 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[.14em] text-signal-warn backdrop-blur">
            High hype
          </span>
        )}
      </div>

      <div className="border-b border-arena-700 bg-[#070b1b]/80 px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[.16em] text-ink-faint">{match.round ?? "Match"}</span>
          <span className="font-mono text-[9px] uppercase tracking-[.12em] text-ink-faint">Match {match.id.slice(0, 6).toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="truncate font-display text-xl uppercase tracking-wide text-ink">{match.playerOne?.gamertag ?? "TBD"}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[.12em] text-corner-p1">Side A</p>
        </div>
        <div className="text-center">
          <div className="font-mono text-2xl font-bold tabular-nums tracking-[-.04em] text-ink">
            {match.playerOneScore}<span className="px-1 text-ink-faint">:</span>{match.playerTwoScore}
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[.16em] text-ink-faint">score</span>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate font-display text-xl uppercase tracking-wide text-ink">{match.playerTwo?.gamertag ?? "TBD"}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[.12em] text-corner-p2">Side B</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-arena-700 px-4 py-2.5 sm:px-5">
        <span className="font-mono text-[9px] uppercase tracking-[.14em] text-ink-faint">{isLive ? "Watch live" : "Open match center"}</span>
        <span className="font-mono text-[10px] font-bold text-ink transition group-hover:text-signal-live">→</span>
      </div>
    </Link>
  );
}
