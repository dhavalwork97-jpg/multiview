"use client";

import { useEffect, useState } from "react";
import { MatchCard, type MatchCardData } from "./MatchCard";
import { useSocket } from "@/hooks/useSocket";

// One REST call for the initial snapshot, then Socket.IO carries every
// update after that — no polling. If the socket drops, socket.io-client
// reconnects on its own and we re-fetch the snapshot on reconnect so the
// grid can't drift silently out of sync.
export function LiveGrid({ tournamentId }: { tournamentId?: string }) {
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket({ tournamentId });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const params = new URLSearchParams({ status: "LIVE" });
        if (tournamentId) params.set("tournamentId", tournamentId);
        const res = await fetch(`/api/matches?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load live matches");
        const data = await res.json();
        if (!cancelled) {
          setMatches(data.matches);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    socket.on("connect", load); // re-sync snapshot after any reconnect
    return () => {
      cancelled = true;
      socket.off("connect", load);
    };
  }, [tournamentId, socket]);

  useEffect(() => {
    function handleMatchUpdated(event: {
      matchId: string;
      status: string;
      playerOneScore: number;
      playerTwoScore: number;
    }) {
      setMatches((prev) => {
        const exists = prev.some((m) => m.id === event.matchId);

        if (event.status !== "LIVE") {
          // match ended or was pulled off-air — drop it from the grid
          return exists ? prev.filter((m) => m.id !== event.matchId) : prev;
        }

        if (exists) {
          return prev.map((m) =>
            m.id === event.matchId
              ? { ...m, status: "LIVE" as const, playerOneScore: event.playerOneScore, playerTwoScore: event.playerTwoScore }
              : m
          );
        }

        // A match just went live that we don't have a full card for yet
        // (e.g. it wasn't LIVE at initial load) — cheapest correct thing
        // to do is re-fetch rather than reconstruct a partial card here.
        const params = new URLSearchParams({ status: "LIVE" });
        if (tournamentId) params.set("tournamentId", tournamentId);
        fetch(`/api/matches?${params.toString()}`)
          .then((r) => r.json())
          .then((data) => setMatches(data.matches))
          .catch(() => {});

        return prev;
      });
    }

    socket.on("match:updated", handleMatchUpdated);
    return () => {
      socket.off("match:updated", handleMatchUpdated);
    };
  }, [socket, tournamentId]);

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading live matches…</p>;
  }

  if (error) {
    return <p className="text-sm text-signal-error">Couldn't load live matches: {error}</p>;
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-arena-600 p-8 text-center text-ink-muted">
        No stations are live right now. Check back once matches start.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
