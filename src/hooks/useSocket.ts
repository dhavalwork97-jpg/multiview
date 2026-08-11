"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

if (!process.env.NEXT_PUBLIC_SOCKET_URL && process.env.NODE_ENV === "production") {
  // Falling back silently here means the socket just reconnect-loops
  // forever against a localhost address the production CSP correctly
  // blocks (see connect-src in next.config.ts) — every attempt shows up
  // as a CSP violation in the console with nothing pointing at "you
  // forgot to set an env var on Vercel." This is that pointer.
  console.error(
    "[socket] NEXT_PUBLIC_SOCKET_URL is not set — falling back to " +
      "http://localhost:4000, which the production Content-Security-Policy " +
      "blocks. Set NEXT_PUBLIC_SOCKET_URL in Vercel (Project Settings → " +
      "Environment Variables) to your Render socket URL, e.g. " +
      "wss://fgc-stream-socket-xxxx.onrender.com, then redeploy — " +
      "NEXT_PUBLIC_* vars are baked in at build time, so a save alone " +
      "won't apply to the current deployment."
  );
}

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
