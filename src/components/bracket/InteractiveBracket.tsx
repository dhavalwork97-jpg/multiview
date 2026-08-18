"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

type BracketMatch = {
  id: string;
  round: string | null;
  status: string;
  playerOneId: string | null;
  playerTwoId: string | null;
  playerOneScore: number;
  playerTwoScore: number;
  winnerId: string | null;
  stationId: string | null;
  youtubeVideoId: string | null;
  playerOne: { gamertag: string };
  playerTwo: { gamertag: string };
  station: { id: string; label: string } | null;
  sides?: Array<{ sideKey: string; participants: Array<{ id: string; player?: { id: string; gamertag: string } | null; team?: { id: string; name: string } | null; displayName?: string | null }> }>;
};

type ParticipantRef = { playerId?: string; teamId?: string; role?: string; displayName?: string };
type StructureSlot = {
  playerOneId: string | null;
  playerTwoId: string | null;
  sideA?: ParticipantRef[];
  sideB?: ParticipantRef[];
  round: string;
};

type StructureRound = { name: string; matches: StructureSlot[] };

export function InteractiveBracket({
  bracketId,
  tournamentId,
  onWatch,
  selectedMatchId,
}: {
  bracketId: string;
  // Optional: when present, the bracket re-fetches itself whenever a
  // match in this tournament updates, so a reported winner visibly
  // advances into the next round's slot without a page refresh — see
  // advanceBracket() in src/lib/bracket-progression.ts for the write
  // side of this.
  tournamentId?: string;
  // Viewer-facing bracket pages pass this to keep the click local (opens
  // the match in the small watch dock instead of navigating away, so
  // browsing the rest of the bracket doesn't lose your place). Omit it
  // (as the admin/organizer bracket view does) to keep the original
  // navigate-straight-to-/watch/:matchId behavior.
  onWatch?: (match: BracketMatch) => void;
  selectedMatchId?: string | null;
}) {
  const router = useRouter();
  const [rounds, setRounds] = useState<StructureRound[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [liveMatchByPlayerId, setLiveMatchByPlayerId] = useState<Record<string, string>>({});
  const [gamertagByPlayerId, setGamertagByPlayerId] = useState<Record<string, string>>({});
  const [participantNameById, setParticipantNameById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const socket = useSocket({ tournamentId });

  useEffect(() => {
    let cancelled = false;
    function load() {
      return fetch(`/api/brackets/${bracketId}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          setRounds(data.bracket.structure);
          setMatches(data.matches);
          setLiveMatchByPlayerId(data.liveMatchByPlayerId);
          setGamertagByPlayerId(data.gamertagByPlayerId ?? {});
          setParticipantNameById(data.participantNameById ?? {});
        })
        .finally(() => !cancelled && setLoading(false));
    }
    load();

    // A winner reported on any match in this tournament can advance this
    // bracket (new Match row instantiated, structure JSON updated) — cheap
    // enough to just refetch the whole bracket rather than diff the event
    // payload against local state.
    if (tournamentId) {
      socket.on("match:updated", load);
    }

    // Socket.IO is an enhancement, not the source of truth. In deployments
    // where the separate socket service is sleeping/unavailable, the bracket
    // must still reflect a newly-created next-round match. Polling the small
    // public bracket endpoint keeps the UI correct without requiring a
    // manual page refresh.
    const poll = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (tournamentId) socket.off("match:updated", load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracketId, tournamentId, socket]);

  if (loading) return <p className="text-sm text-ink-muted">Loading bracket…</p>;

  // A slot from the static structure may or may not have a real Match row
  // yet (only slots with two known players get one — see the import
  // route). Match on player ids + round name to find it.
  function findMatch(slot: StructureSlot): BracketMatch | undefined {
    return matches.find((m) => m.round === slot.round && m.playerOneId === slot.playerOneId && m.playerTwoId === slot.playerTwoId);
  }

  function sideName(slot: StructureSlot, side: "A" | "B", match?: BracketMatch) {
    const refs = side === "A" ? slot.sideA : slot.sideB;
    if (refs?.length) {
      return refs.map((ref) => ref.playerId ? participantNameById[`player:${ref.playerId}`] ?? gamertagByPlayerId[ref.playerId] : ref.teamId ? participantNameById[`team:${ref.teamId}`] : ref.displayName).filter(Boolean).join(" / ") || "TBD";
    }
    const participants = match?.sides?.find((s) => s.sideKey === side)?.participants ?? [];
    if (participants.length) return participants.map((p) => p.player?.gamertag ?? p.team?.name ?? p.displayName).filter(Boolean).join(" / ") || "TBD";
    return side === "A" ? (slot.playerOneId ? gamertagByPlayerId[slot.playerOneId] ?? "…" : "TBD") : (slot.playerTwoId ? gamertagByPlayerId[slot.playerTwoId] ?? "…" : "TBD");
  }

  function openMatch(match: BracketMatch | undefined) {
    if (!match) return;
    if (onWatch) {
      onWatch(match);
    } else {
      router.push(`/watch/${match.id}`);
    }
  }

  function openIfLive(playerId: string | null) {
    if (!playerId) return;
    const liveMatchId = liveMatchByPlayerId[playerId];
    if (!liveMatchId) return;
    const match = matches.find((m) => m.id === liveMatchId);
    openMatch(match);
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
            const isSelected = !!match && match.id === selectedMatchId;
            const p1Name = sideName(slot, "A", match);
            const p2Name = sideName(slot, "B", match);
            const hasLiveA = !!slot.playerOneId && !!liveMatchByPlayerId[slot.playerOneId];
            const hasLiveB = !!slot.playerTwoId && !!liveMatchByPlayerId[slot.playerTwoId];

            return (
              <div
                key={`${round.name}-${i}`}
                className={`rounded-card border bg-arena-800 text-sm transition-colors ${
                  isSelected ? "border-signal-live" : "border-arena-600"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openMatch(match)}
                  disabled={!match || (!hasLiveA && match.status !== "LIVE")}
                  className="flex w-full items-center justify-between border-b border-arena-700 border-l-2 border-l-corner-p1 px-3 py-2 text-left disabled:cursor-default enabled:hover:bg-arena-700"
                >
                  <span className="truncate">{p1Name}</span>
                  {match && <span className="font-mono text-ink-muted">{match.playerOneScore}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => openMatch(match)}
                  disabled={!match || (!hasLiveB && match.status !== "LIVE")}
                  className="flex w-full items-center justify-between border-l-2 border-l-corner-p2 px-3 py-2 text-left disabled:cursor-default enabled:hover:bg-arena-700"
                >
                  <span className="truncate">{p2Name}</span>
                  {match && <span className="font-mono text-ink-muted">{match.playerTwoScore}</span>}
                </button>

                {match?.station && (
                  <button
                    type="button"
                    onClick={() => openMatch(match)}
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
