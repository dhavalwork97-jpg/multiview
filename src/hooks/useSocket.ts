"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

const DEFAULT_PRODUCTION_SOCKET_URL = "https://fgc-stream-socket.onrender.com";
const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

function resolveSocketUrl() {
  if (process.env.NODE_ENV !== "production") {
    return configuredSocketUrl || "http://localhost:4000";
  }

  // Production always has a safe canonical Socket.IO origin. Treat the
  // documentation placeholder and empty value as "not configured" rather
  // than allowing them to produce noisy console warnings or malformed URLs.
  if (!configuredSocketUrl || configuredSocketUrl.includes("<actual-fgc-stream-socket>")) {
    return DEFAULT_PRODUCTION_SOCKET_URL;
  }

  // Never let a tournament route, station LAN IP, or the Next.js web service
  // become the Socket.IO origin. Those values produce URLs such as
  // /admin/tournaments/<id>/192.168.x.x and cannot work from a public site.
  try {
    const url = new URL(configuredSocketUrl);
    const hostname = url.hostname.toLowerCase();
    const isPrivateLanHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
    const hasAppRoute = url.pathname !== "/" && url.pathname !== "";

    if (isPrivateLanHost || hasAppRoute) {
      return DEFAULT_PRODUCTION_SOCKET_URL;
    }

    return url.origin;
  } catch {
    return DEFAULT_PRODUCTION_SOCKET_URL;
  }
}

const SOCKET_URL = resolveSocketUrl();

// One shared connection per browser tab, reused across every component
// that calls this hook, rather than one socket per component instance.
let sharedSocket: Socket | null = null;

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });
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
