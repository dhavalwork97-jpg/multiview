"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
  station: { label: string } | null;
};

type StructureSlot = {
  playerOneId: string | null;
  playerTwoId: string | null;
  round: string;
};

type StructureRound = { name: string; matches: StructureSlot[] };

export function InteractiveBracket({ bracketId }: { bracketId: string }) {
  const router = useRouter();
  const [rounds, setRounds] = useState<StructureRound[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [liveMatchByPlayerId, setLiveMatchByPlayerId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/brackets/${bracketId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRounds(data.bracket.structure);
        setMatches(data.matches);
        setLiveMatchByPlayerId(data.liveMatchByPlayerId);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bracketId]);

  if (loading) return <p className="text-sm text-ink-muted">Loading bracket…</p>;

  // A slot from the static structure may or may not have a real Match row
  // yet (only slots with two known players get one — see the import
  // route). Match on player ids + round name to find it.
  function findMatch(slot: StructureSlot): BracketMatch | undefined {
    return matches.find(
      (m) =>
        m.round === slot.round &&
        m.playerOneId === slot.playerOneId &&
        m.playerTwoId === slot.playerTwoId
    );
  }

  function goToPlayerIfLive(playerId: string | null) {
    if (!playerId) return;
    const liveMatchId = liveMatchByPlayerId[playerId];
    if (liveMatchId) router.push(`/watch/${liveMatchId}`);
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round) => (
        <div key={round.name} className="flex min-w-[220px] flex-col gap-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            {round.name}
          </h3>
          {round.matches.map((slot, i) => {
            const match = findMatch(slot);
            const isLive = match?.status === "LIVE";
            const p1Name = match?.playerOne.gamertag ?? (slot.playerOneId ? slot.playerOneId : "TBD");
            const p2Name = match?.playerTwo.gamertag ?? (slot.playerTwoId ? slot.playerTwoId : "TBD");

            return (
              <div
                key={`${round.name}-${i}`}
                className="rounded-card border border-arena-600 bg-arena-800 text-sm"
              >
                <button
                  type="button"
                  onClick={() => goToPlayerIfLive(slot.playerOneId)}
                  disabled={!slot.playerOneId || !liveMatchByPlayerId[slot.playerOneId]}
                  className="flex w-full items-center justify-between border-b border-arena-700 border-l-2 border-l-corner-p1 px-3 py-2 text-left disabled:cursor-default enabled:hover:bg-arena-700"
                >
                  <span className="truncate">{p1Name}</span>
                  {match && <span className="font-mono text-ink-muted">{match.playerOneScore}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => goToPlayerIfLive(slot.playerTwoId)}
                  disabled={!slot.playerTwoId || !liveMatchByPlayerId[slot.playerTwoId]}
                  className="flex w-full items-center justify-between border-l-2 border-l-corner-p2 px-3 py-2 text-left disabled:cursor-default enabled:hover:bg-arena-700"
                >
                  <span className="truncate">{p2Name}</span>
                  {match && <span className="font-mono text-ink-muted">{match.playerTwoScore}</span>}
                </button>

                {match?.station && (
                  <button
                    type="button"
                    onClick={() => router.push(`/watch/${match.id}`)}
                    className="flex w-full items-center gap-1.5 border-t border-arena-700 px-3 py-1.5 text-xs text-ink-faint hover:text-signal-live"
                  >
                    {isLive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" />
                    )}
                    {match.station.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
