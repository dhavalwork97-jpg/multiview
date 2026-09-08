"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

type BracketMatch = {
  id: string;
  round: string | null;
  status: string;
  playerOneId: string;
  playerTwoId: string;
  playerOneScore: number;
  playerTwoScore: number;
  winnerId: string | null;
  stationId: string | null;
  youtubeVideoId: string | null;
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
  station: { id: string; label: string } | null;
};

type StructureSlot = { playerOneId: string | null; playerTwoId: string | null; round: string };
type StructureRound = { name: string; matches: StructureSlot[] };

export function InteractiveBracket({ bracketId, tournamentId, onWatch, selectedMatchId }: { bracketId: string; tournamentId?: string; onWatch?: (match: BracketMatch) => void; selectedMatchId?: string | null }) {
  const router = useRouter();
  const [rounds, setRounds] = useState<StructureRound[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [liveMatchByPlayerId, setLiveMatchByPlayerId] = useState<Record<string, string>>({});
  const [gamertagByPlayerId, setGamertagByPlayerId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const socket = useSocket({ tournamentId });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/brackets/${bracketId}`);
        if (!response.ok) throw new Error("Bracket request failed");
        const data = await response.json();
        if (cancelled) return;
        setRounds(data.bracket.structure ?? []);
        setMatches(data.matches ?? []);
        setLiveMatchByPlayerId(data.liveMatchByPlayerId ?? {});
        setGamertagByPlayerId(data.gamertagByPlayerId ?? {});
      } catch {
        if (!cancelled) { setRounds([]); setMatches([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    if (tournamentId) socket.on("match:updated", load);
    const poll = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (tournamentId) socket.off("match:updated", load);
    };
  }, [bracketId, tournamentId, socket]);

  if (loading) return <p className="text-sm text-ink-muted">Loading bracket…</p>;
  if (rounds.length === 0) return <p className="text-sm text-ink-faint">No bracket published yet.</p>;

  function findMatch(slot: StructureSlot) {
    return matches.find((m) => m.round === slot.round && m.playerOneId === slot.playerOneId && m.playerTwoId === slot.playerTwoId);
  }
  function openMatch(match: BracketMatch | undefined) {
    if (!match) return;
    if (onWatch) onWatch(match); else router.push(`/watch/${match.id}`);
  }
  function openIfLive(playerId: string | null) {
    if (!playerId) return;
    openMatch(matches.find((m) => m.id === liveMatchByPlayerId[playerId]));
  }

  return (
    <div className="rounded-panel border border-arena-700 bg-arena-950/60 p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-signal-live">Competition tree</p>
          <p className="mt-1 text-xs text-ink-faint">Live nodes update automatically. Select any completed or live match for its watch view.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" /> Live</div>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-2">
        {rounds.map((round) => (
          <div key={round.name} className="flex min-w-[230px] flex-1 flex-col gap-3">
            <div className="border-b border-arena-700 pb-2">
              <h3 className="font-display text-lg uppercase tracking-wide text-ink">{round.name}</h3>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{round.matches.length} slot{round.matches.length === 1 ? "" : "s"}</p>
            </div>
            {round.matches.map((slot, i) => {
              const match = findMatch(slot);
              const isLive = match?.status === "LIVE";
              const isSelected = Boolean(match && match.id === selectedMatchId);
              const p1Name = match?.playerOne?.gamertag ?? (slot.playerOneId ? gamertagByPlayerId[slot.playerOneId] ?? "…" : "TBD");
              const p2Name = match?.playerTwo?.gamertag ?? (slot.playerTwoId ? gamertagByPlayerId[slot.playerTwoId] ?? "…" : "TBD");
              return (
                <article key={`${round.name}-${i}`} className={`overflow-hidden rounded-card border bg-arena-800 transition-all ${isSelected ? "border-signal-live shadow-signal" : isLive ? "border-signal-live/50" : "border-arena-600"}`}>
                  <button type="button" onClick={() => openIfLive(slot.playerOneId)} disabled={!liveMatchByPlayerId[slot.playerOneId ?? ""]} className="flex w-full items-center justify-between border-b border-arena-700 border-l-2 border-l-corner-p1 px-3 py-2.5 text-left disabled:cursor-default enabled:hover:bg-arena-700/70">
                    <span className={`truncate text-sm ${match?.winnerId === match?.playerOneId ? "font-semibold text-ink" : "text-ink-muted"}`}>{p1Name}</span>
                    {match && <span className="ml-3 font-mono text-sm font-semibold tabular-nums text-ink">{match.playerOneScore}</span>}
                  </button>
                  <button type="button" onClick={() => openIfLive(slot.playerTwoId)} disabled={!liveMatchByPlayerId[slot.playerTwoId ?? ""]} className="flex w-full items-center justify-between border-l-2 border-l-corner-p2 px-3 py-2.5 text-left disabled:cursor-default enabled:hover:bg-arena-700/70">
                    <span className={`truncate text-sm ${match?.winnerId === match?.playerTwoId ? "font-semibold text-ink" : "text-ink-muted"}`}>{p2Name}</span>
                    {match && <span className="ml-3 font-mono text-sm font-semibold tabular-nums text-ink">{match.playerTwoScore}</span>}
                  </button>
                  {match && <button type="button" onClick={() => openMatch(match)} className="flex w-full items-center justify-between border-t border-arena-700 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-ink-faint hover:bg-arena-700/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live focus-visible:ring-inset"><span className="flex items-center gap-2">{isLive && <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />}{isLive ? "On air" : match.status === "COMPLETED" ? "Final · Match view" : "Match view"}</span><span>{match.station?.label ?? "Open →"}</span></button>}
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
