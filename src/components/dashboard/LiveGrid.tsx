"use client";

import { useEffect, useState } from "react";
import { MatchCard, type MatchCardData } from "./MatchCard";
import { useSocket } from "@/hooks/useSocket";

// One REST call for the initial snapshot, then Socket.IO carries every
// update after that. Reconnects re-sync the snapshot so the grid stays
// consistent with the live match feed.
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
    socket.on("connect", load);
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
          return exists ? prev.filter((m) => m.id !== event.matchId) : prev;
        }

        if (exists) {
          return prev.map((m) =>
            m.id === event.matchId
              ? { ...m, status: "LIVE" as const, playerOneScore: event.playerOneScore, playerTwoScore: event.playerTwoScore }
              : m
          );
        }

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
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading live matches">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card overflow-hidden rounded-[12px]">
            <div className="aspect-video animate-pulse bg-white/[.035]" />
            <div className="space-y-3 p-4">
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[.06]" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-white/[.06]" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/[.045]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state border-signal-error/25 bg-signal-error/[.03]">
        <p className="section-label text-signal-error">Live feed unavailable</p>
        <p className="mt-2 text-sm text-ink-muted">{error}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="empty-state">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-corner-p2/30 bg-corner-p2/[.07] text-corner-p2" aria-hidden="true">◉</span>
        <p className="mt-4 font-display text-2xl uppercase tracking-wide text-ink">No stations are live</p>
        <p className="mt-1 text-sm text-ink-muted">Check back once matches start broadcasting.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {matches.map((match) => <MatchCard key={match.id} match={match} />)}
    </div>
  );
}
