"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useSocket } from "@/hooks/useSocket";

type SyncState = { position: number; playing: boolean; at: number; actorId: string };
type ContextValue = { media: HTMLVideoElement | null; registerMedia: (media: HTMLVideoElement | null) => void; partyCode: string; isHost: boolean; state: SyncState | null; sendState: (patch: Omit<SyncState, "at" | "actorId">) => void };

const Context = createContext<ContextValue | null>(null);

export function WatchPartyProvider({ children, partyCode, isHost, socket }: { children: ReactNode; partyCode: string; isHost: boolean; socket?: Socket }) {
  const fallbackSocket = useSocket();
  const activeSocket = socket ?? fallbackSocket;
  const [media, setMedia] = useState<HTMLVideoElement | null>(null);
  const [state, setState] = useState<SyncState | null>(null);
  const actorId = useMemo(() => (typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36)), []);
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (!partyCode) return;
    activeSocket.emit("join:party", partyCode);
    const onSync = (next: SyncState) => {
      if (next.actorId === actorId) return;
      setState(next);
      if (!media) return;
      applyingRemote.current = true;
      if (Math.abs(media.currentTime - next.position) > 0.75) media.currentTime = next.position;
      if (next.playing) void media.play().catch(() => undefined); else media.pause();
      window.setTimeout(() => { applyingRemote.current = false; }, 0);
    };
    activeSocket.on("party:sync", onSync);
    return () => { activeSocket.emit("leave:party", partyCode); activeSocket.off("party:sync", onSync); };
  }, [activeSocket, actorId, media, partyCode]);

  useEffect(() => {
    if (!media || !partyCode || !isHost) return;
    const emit = () => {
      if (applyingRemote.current) return;
      activeSocket.emit("party:sync", partyCode, { position: media.currentTime, playing: !media.paused, at: Date.now(), actorId });
    };
    media.addEventListener("play", emit); media.addEventListener("pause", emit); media.addEventListener("seeked", emit);
    return () => { media.removeEventListener("play", emit); media.removeEventListener("pause", emit); media.removeEventListener("seeked", emit); };
  }, [activeSocket, actorId, isHost, media, partyCode]);

  const value = useMemo<ContextValue>(() => ({
    media, registerMedia: setMedia, partyCode, isHost, state,
    sendState: (patch) => activeSocket.emit("party:sync", partyCode, { ...patch, at: Date.now(), actorId }),
  }), [activeSocket, actorId, isHost, media, partyCode, state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWatchPartyMedia() {
  return useContext(Context);
}
