"use client";
import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import type { Reaction } from "@/lib/social-types";

function sessionId() { const key = "fgc_social_session"; let value = sessionStorage.getItem(key); if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key, value); } return value; }
export function usePresence(matchId: string) {
  const [count, setCount] = useState(0); const socket = useSocket({ matchId });
  useEffect(() => { let cancelled = false; const beat = async () => { const response = await fetch(`/api/social/presence/${matchId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionId() }) }); if (response.ok && !cancelled) setCount((await response.json()).count); }; void beat(); const timer = setInterval(() => void beat(), 45_000); const onUpdate = (event: { count: number }) => setCount(event.count); socket.on("presence:updated", onUpdate); return () => { cancelled = true; clearInterval(timer); socket.off("presence:updated", onUpdate); }; }, [matchId, socket]);
  return count;
}
export function useReactionStream(matchId: string) {
  const [reactions, setReactions] = useState<Array<{ id: string; reaction: string }>>([]); const socket = useSocket({ matchId });
  useEffect(() => { const onReaction = (event: { id: string; reaction: string }) => { setReactions((items) => [...items.slice(-12), event]); setTimeout(() => setReactions((items) => items.filter((item) => item.id !== event.id)), 4500); }; socket.on("reaction:created", onReaction); return () => { socket.off("reaction:created", onReaction); }; }, [socket]);
  const send = useCallback(async (reaction: Reaction) => { const response = await fetch("/api/social/reaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId, reaction, sessionId: sessionId() }) }); return response.ok; }, [matchId]);
  return { reactions, send };
}
export function useActivityFeed(matchId?: string) {
  const [events, setEvents] = useState<Array<{ id: string; message: string; createdAt: string }>>([]); const socket = useSocket({ matchId });
  useEffect(() => { const load = async () => { const response = await fetch(`/api/social/activity${matchId ? `?matchId=${matchId}` : ""}`); if (response.ok) setEvents((await response.json()).events); }; void load(); const onActivity = (event: { id: string; message: string; createdAt: string; matchId: string | null }) => { if (!matchId || !event.matchId || event.matchId === matchId) setEvents((items) => [event, ...items].slice(0, 15)); }; socket.on("activity:created", onActivity); return () => { socket.off("activity:created", onActivity); }; }, [matchId, socket]); return events;
}
export function usePulse(matchId: string) { const [pulse, setPulse] = useState({ score: 0, viewers: 0, reactions: 0 }); const socket = useSocket({ matchId }); useEffect(() => { void fetch(`/api/social/pulse/${matchId}`).then((r) => r.ok ? r.json() : null).then((v) => v && setPulse(v)); const update = (v: typeof pulse) => setPulse(v); socket.on("pulse:updated", update); return () => { socket.off("pulse:updated", update); }; }, [matchId, socket]); return pulse; }
