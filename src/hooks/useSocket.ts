"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

// One shared connection per browser tab, reused across every component
// that calls this hook, rather than one socket per component instance.
let sharedSocket: Socket | null = null;

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, { transports: ["websocket"] });
  }
  return sharedSocket;
}

/**
 * Joins the given tournament/match rooms for the lifetime of the calling
 * component and returns the shared socket so callers can attach their own
 * event listeners. Rooms are left automatically on unmount.
 */
export function useSocket({
  tournamentId,
  matchId,
}: {
  tournamentId?: string;
  matchId?: string;
} = {}) {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (tournamentId) socket.emit("join:tournament", tournamentId);
    return () => {
      if (tournamentId) socket.emit("leave:tournament", tournamentId);
    };
  }, [tournamentId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (matchId) socket.emit("join:match", matchId);
    return () => {
      if (matchId) socket.emit("leave:match", matchId);
    };
  }, [matchId]);

  return socketRef.current;
}
