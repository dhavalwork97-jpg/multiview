"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getBroadcastTheme } from "@/lib/broadcast/themes";
import {
  applyBroadcastOverlayEvent,
  createInitialOverlayState,
  getOverlayThemeVars,
  readNumber,
  readString,
  type BroadcastOverlayEvent,
  type BroadcastOverlayKind,
  type BroadcastOverlayState,
} from "@/lib/broadcast/overlay-runtime";

const DEFAULT_KIND: BroadcastOverlayKind = "program";

function asKind(value: string | null): BroadcastOverlayKind {
  const allowed: BroadcastOverlayKind[] = [
    "scoreboard",
    "lower-third",
    "countdown",
    "intro",
    "versus",
    "winner",
    "replay",
    "sponsor",
    "program",
  ];
  return value && allowed.includes(value as BroadcastOverlayKind)
    ? (value as BroadcastOverlayKind)
    : DEFAULT_KIND;
}

function overlayText(overlay: Record<string, unknown> | null, key: string, fallback: string) {
  return readString(overlay?.[key], fallback);
}

export default function BroadcastOverlayPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState("");
  const [kind, setKind] = useState<BroadcastOverlayKind>(DEFAULT_KIND);
  const [game, setGame] = useState<string | null>(null);
  const [state, setState] = useState<BroadcastOverlayState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    void params.then(({ tournamentId: id }) => {
      if (!active) return;
      const search = new URLSearchParams(window.location.search);
      setTournamentId(id);
      setKind(asKind(search.get("kind")));
      setGame(search.get("game"));
      setState(createInitialOverlayState(id));
    });
    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!tournamentId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || window.location.origin;
    const socket: Socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    const onConnect = () => {
      setConnected(true);
      socket.emit("join:tournament", tournamentId);
    };
    const onDisconnect = () => setConnected(false);
    const onBroadcast = (event: BroadcastOverlayEvent) => {
      setState((current) => (current ? applyBroadcastOverlayEvent(current, event) : current));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("broadcast:updated", onBroadcast);

    return () => {
      socket.emit("leave:tournament", tournamentId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("broadcast:updated", onBroadcast);
      socket.disconnect();
    };
  }, [tournamentId]);

  const theme = useMemo(() => getBroadcastTheme(game), [game]);
  const current = state ?? createInitialOverlayState(tournamentId || "broadcast");
  const vars = getOverlayThemeVars(theme);
  const overlay = current.overlay;
  const teamA = overlayText(overlay, "teamA", overlayText(overlay, "playerOne", "TEAM A"));
  const teamB = overlayText(overlay, "teamB", overlayText(overlay, "playerTwo", "TEAM B"));
  const scoreA = readNumber(overlay?.scoreA ?? overlay?.playerOneScore, 0);
  const scoreB = readNumber(overlay?.scoreB ?? overlay?.playerTwoScore, 0);
  const title = overlayText(overlay, "title", theme.label);
  const subtitle = overlayText(overlay, "subtitle", "FGC BROADCAST");
  const winner = overlayText(overlay, "winner", teamA);
  const sponsor = overlay && typeof overlay.sponsor === "object" && overlay.sponsor !== null
    ? (overlay.sponsor as Record<string, unknown>)
    : null;
  const clip = overlay && typeof overlay.clip === "object" && overlay.clip !== null
    ? (overlay.clip as Record<string, unknown>)
    : null;
  const seconds = Math.max(0, Math.ceil(readNumber(overlay?.seconds, 5)));

  return (
    <main className={`overlay overlay-${theme.shape}`} style={vars}>
      <div className="ambient" />
      {kind === "scoreboard" && current.scene === "gameplay" ? (
        <section className="scoreboard" aria-label="Live scoreboard">
          <div className="team team-a"><span>{teamA}</span><strong>{scoreA}</strong></div>
          <div className="game-mark">{theme.label}</div>
          <div className="team team-b"><strong>{scoreB}</strong><span>{teamB}</span></div>
        </section>
      ) : null}

      {kind === "lower-third" && (current.scene === "intro" || current.scene === "versus") ? (
        <section className="lower-third">
          <div className="eyebrow">{subtitle}</div>
          <div className="lower-title">{title}</div>
          <div className="lower-meta">{teamA} <span>VS</span> {teamB}</div>
        </section>
      ) : null}

      {kind === "countdown" && current.scene === "starting-soon" ? (
        <section className="countdown">
          <div className="eyebrow">STARTING SOON</div>
          <strong>{seconds}</strong>
          <span>{subtitle}</span>
        </section>
      ) : null}

      {kind === "intro" && current.scene === "intro" ? (
        <section className="intro-card">
          <div className="eyebrow">{subtitle}</div>
          <h1>{title}</h1>
          <div className="vs-line"><span>{teamA}</span><b>VS</b><span>{teamB}</span></div>
        </section>
      ) : null}

      {kind === "versus" && current.scene === "versus" ? (
        <section className="versus-card">
          <div className="versus-team">{teamA}</div>
          <div className="versus">VS</div>
          <div className="versus-team">{teamB}</div>
        </section>
      ) : null}

      {kind === "winner" && (current.scene === "winner" || current.scene === "champion") ? (
        <section className="winner-card">
          <div className="eyebrow">{current.scene === "champion" ? "CHAMPION" : "MATCH WINNER"}</div>
          <h1>{winner}</h1>
          <div className="winner-score">{scoreA} — {scoreB}</div>
        </section>
      ) : null}

      {kind === "replay" && current.scene === "replay" ? (
        <section className="replay-card">
          <span className="replay-tag">REPLAY</span>
          <strong>{readString(clip?.title, "Instant Replay")}</strong>
          <small>{readString(clip?.durationMs, "") ? `${Math.ceil(readNumber(clip?.durationMs) / 1000)}s` : ""}</small>
        </section>
      ) : null}

      {kind === "sponsor" && current.scene === "gameplay" && sponsor ? (
        <section className="sponsor-card">
          <span>POWERED BY</span>
          <strong>{readString(sponsor.name, "Sponsor")}</strong>
        </section>
      ) : null}

      {kind === "program" ? (
        <section className={`program-scene scene-${current.scene}`}>
          <div className="scene-pill">{current.scene.replaceAll("-", " ").toUpperCase()}</div>
          <div className="program-title">{title}</div>
          <div className="program-match">{teamA} <span>VS</span> {teamB}</div>
        </section>
      ) : null}

      <div className="sync-indicator" data-connected={connected} aria-label={connected ? "Broadcast connected" : "Broadcast disconnected"} />

      <style jsx>{`
        .overlay { position: relative; width: 100vw; height: 100vh; overflow: hidden; color: var(--broadcast-text); background: transparent; font-family: Arial, Helvetica, sans-serif; pointer-events: none; }
        .ambient { position: absolute; inset: auto -10vw -35vh; height: 70vh; background: radial-gradient(circle, var(--broadcast-glow), transparent 65%); opacity: .65; filter: blur(28px); }
        .scoreboard { position: absolute; left: 50%; top: 5.5vh; transform: translateX(-50%); display: grid; grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr); align-items: center; min-width: min(86vw, 1100px); padding: 10px; border: 1px solid color-mix(in srgb, var(--broadcast-accent) 60%, transparent); background: color-mix(in srgb, var(--broadcast-surface) 94%, transparent); box-shadow: 0 18px 55px var(--broadcast-glow); backdrop-filter: blur(16px); }
        .team { display: flex; align-items: center; gap: 18px; padding: 14px 22px; font-size: clamp(16px, 2vw, 26px); font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
        .team-a { justify-content: flex-end; border-right: 1px solid color-mix(in srgb, var(--broadcast-accent-alt) 35%, transparent); }
        .team-b { justify-content: flex-start; border-left: 1px solid color-mix(in srgb, var(--broadcast-accent-alt) 35%, transparent); }
        .team strong { min-width: 42px; text-align: center; font-size: clamp(26px, 3vw, 42px); color: var(--broadcast-accent); }
        .game-mark { padding: 0 22px; font-size: 11px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; opacity: .75; }
        .lower-third { position: absolute; left: 7vw; bottom: 10vh; min-width: 420px; padding: 18px 28px; border-left: 5px solid var(--broadcast-accent); background: linear-gradient(90deg, color-mix(in srgb, var(--broadcast-surface) 96%, transparent), transparent); box-shadow: 0 16px 50px var(--broadcast-glow); animation: rise .45s ease-out both; }
        .eyebrow, .replay-tag { font-size: 11px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: var(--broadcast-accent-alt); }
        .lower-title { margin-top: 5px; font-size: clamp(30px, 4vw, 58px); font-weight: 900; line-height: .95; text-transform: uppercase; }
        .lower-meta { margin-top: 10px; font-size: 14px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; opacity: .8; }
        .lower-meta span, .vs-line b, .program-match span { margin: 0 10px; color: var(--broadcast-accent); }
        .countdown { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 8px; text-align: center; text-transform: uppercase; }
        .countdown strong { font-size: clamp(110px, 20vw, 280px); line-height: .8; font-weight: 950; text-shadow: 0 0 45px var(--broadcast-glow); color: var(--broadcast-accent); }
        .countdown span { font-size: 13px; font-weight: 900; letter-spacing: .24em; opacity: .72; }
        .intro-card, .versus-card, .winner-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; animation: rise .55s ease-out both; }
        .intro-card h1 { margin: 14px 0 24px; font-size: clamp(48px, 8vw, 128px); line-height: .82; text-transform: uppercase; font-weight: 950; text-shadow: 0 12px 45px var(--broadcast-glow); }
        .vs-line { display: flex; align-items: center; justify-content: center; font-size: clamp(18px, 2.5vw, 34px); font-weight: 900; text-transform: uppercase; }
        .versus-card { display: flex; align-items: center; gap: clamp(20px, 5vw, 90px); font-size: clamp(38px, 7vw, 110px); font-weight: 950; text-transform: uppercase; }
        .versus { color: var(--broadcast-accent); font-style: italic; text-shadow: 0 0 45px var(--broadcast-glow); }
        .winner-card { min-width: 55vw; padding: 50px 70px; border: 1px solid color-mix(in srgb, var(--broadcast-accent) 70%, transparent); background: color-mix(in srgb, var(--broadcast-surface) 94%, transparent); box-shadow: 0 24px 90px var(--broadcast-glow); }
        .winner-card h1 { margin: 14px 0; font-size: clamp(54px, 9vw, 150px); line-height: .8; text-transform: uppercase; font-weight: 950; }
        .winner-score { font-size: 18px; font-weight: 800; opacity: .7; letter-spacing: .16em; }
        .replay-card { position: absolute; right: 6vw; bottom: 8vh; display: grid; gap: 8px; min-width: 280px; padding: 18px 24px; border-right: 4px solid var(--broadcast-accent); background: linear-gradient(270deg, color-mix(in srgb, var(--broadcast-surface) 96%, transparent), transparent); animation: rise .4s ease-out both; }
        .replay-card strong { font-size: 25px; text-transform: uppercase; }
        .replay-card small { opacity: .6; }
        .sponsor-card { position: absolute; right: 5vw; bottom: 5vh; display: grid; gap: 4px; padding: 12px 20px; background: color-mix(in srgb, var(--broadcast-surface) 90%, transparent); border: 1px solid color-mix(in srgb, var(--broadcast-accent-alt) 30%, transparent); box-shadow: 0 8px 35px var(--broadcast-glow); }
        .sponsor-card span { font-size: 9px; font-weight: 900; letter-spacing: .2em; opacity: .6; }
        .sponsor-card strong { font-size: 20px; text-transform: uppercase; }
        .program-scene { position: absolute; inset: auto 5vw 5vh; display: grid; justify-items: center; text-align: center; opacity: .95; }
        .scene-pill { padding: 6px 12px; border: 1px solid color-mix(in srgb, var(--broadcast-accent) 60%, transparent); font-size: 9px; font-weight: 900; letter-spacing: .2em; color: var(--broadcast-accent); }
        .program-title { margin-top: 12px; font-size: clamp(26px, 4vw, 58px); font-weight: 950; text-transform: uppercase; }
        .program-match { margin-top: 7px; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .72; }
        .sync-indicator { position: absolute; right: 14px; top: 14px; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; opacity: .35; }
        .sync-indicator[data-connected="true"] { background: #22c55e; opacity: .75; box-shadow: 0 0 12px #22c55e; }
        @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 700px) { .scoreboard { min-width: 96vw; grid-template-columns: 1fr auto 1fr; } .team { padding: 10px 8px; gap: 7px; font-size: 12px; } .game-mark { padding: 0 7px; font-size: 8px; } .lower-third { left: 4vw; min-width: 0; max-width: 90vw; } .winner-card { min-width: 80vw; padding: 32px 24px; } }
      `}</style>
    </main>
  );
}
