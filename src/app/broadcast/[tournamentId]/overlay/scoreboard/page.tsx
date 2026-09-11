"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { getBroadcastTheme } from "@/lib/broadcast/themes";
import { getOverlayThemeVars, readString } from "@/lib/broadcast/overlay-runtime";
import { animationForScoreUpdate, normalizeLiveScore, type LiveScoreState, type LiveGraphicsAnimation } from "@/lib/broadcast/live-graphics";

type MatchUpdatedEvent = { type: "match:updated"; tournamentId: string; matchId: string; status: string; playerOneScore: number; playerTwoScore: number; winnerId: string | null; winnerSideId?: string | null; sideScores?: { A: number; B: number }; stationId: string | null };

type Props = { params: Promise<{ tournamentId: string }> };

export default function LiveScoreboardOverlay({ params }: Props) {
  const [tournamentId, setTournamentId] = useState("");
  const [game, setGame] = useState("valorant");
  const [connected, setConnected] = useState(false);
  const [score, setScore] = useState<LiveScoreState>(() => normalizeLiveScore({}));
  const [animation, setAnimation] = useState<LiveGraphicsAnimation>("score-steady");
  const [teamA, setTeamA] = useState("TEAM A");
  const [teamB, setTeamB] = useState("TEAM B");

  useEffect(() => { let active = true; void params.then(({ tournamentId: id }) => { if (!active) return; setTournamentId(id); const query = new URLSearchParams(window.location.search); setGame(query.get("game") || "valorant"); setTeamA(query.get("teamA") || "TEAM A"); setTeamB(query.get("teamB") || "TEAM B"); }); return () => { active = false; }; }, [params]);

  useEffect(() => {
    if (!tournamentId) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || window.location.origin, { transports: ["websocket", "polling"] });
    const onConnect = () => { setConnected(true); socket.emit("join:tournament", tournamentId); };
    const onDisconnect = () => setConnected(false);
    const onMatchUpdated = (event: MatchUpdatedEvent) => {
      if (event.tournamentId !== tournamentId) return;
      setScore((previous) => {
        const next = normalizeLiveScore({ scoreA: event.sideScores?.A ?? event.playerOneScore, scoreB: event.sideScores?.B ?? event.playerTwoScore, eventType: event.winnerId ? "round" : "score" }, previous);
        setAnimation(animationForScoreUpdate(previous, next));
        return next;
      });
    };
    socket.on("connect", onConnect); socket.on("disconnect", onDisconnect); socket.on("match:updated", onMatchUpdated);
    return () => { socket.emit("leave:tournament", tournamentId); socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off("match:updated", onMatchUpdated); socket.disconnect(); };
  }, [tournamentId]);

  const theme = useMemo(() => getBroadcastTheme(game), [game]);
  const leader = score.leader === "A" ? teamA : score.leader === "B" ? teamB : "TIED";
  const status = readString(score.lastEvent, "LIVE").replace("match-point", "MATCH POINT").toUpperCase();

  return (
    <main className={`scoreboard ${animation}`} style={getOverlayThemeVars(theme)}>
      <section className="bar">
        <div className={`side ${score.leader === "A" ? "leading" : ""}`}><span>{teamA}</span><strong>{score.scoreA}</strong></div>
        <div className="meta"><small>{theme.label}</small><b>{score.roundLabel}</b><em>{status}</em></div>
        <div className={`side side-b ${score.leader === "B" ? "leading" : ""}`}><strong>{score.scoreB}</strong><span>{teamB}</span></div>
      </section>
      <div className="leader">{leader}</div><i className={`connection ${connected ? "live" : ""}`} />
      <style jsx>{` .scoreboard{position:relative;width:100vw;height:100vh;background:transparent;color:var(--broadcast-text);font-family:Arial,Helvetica,sans-serif;pointer-events:none;text-transform:uppercase}.bar{position:absolute;top:5vh;left:50%;transform:translateX(-50%);width:min(92vw,1250px);display:grid;grid-template-columns:1fr 170px 1fr;align-items:stretch;background:color-mix(in srgb,var(--broadcast-surface) 95%,transparent);border:1px solid color-mix(in srgb,var(--broadcast-accent) 80%,transparent);box-shadow:0 18px 60px var(--broadcast-glow);backdrop-filter:blur(14px);overflow:hidden}.side{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:12px 24px;font-size:clamp(16px,2vw,30px);font-weight:950;border-bottom:4px solid transparent}.side strong{font-size:clamp(34px,4vw,60px);color:var(--broadcast-accent)}.side.leading{border-bottom-color:var(--broadcast-accent);background:color-mix(in srgb,var(--broadcast-accent) 9%,transparent)}.side-b{justify-content:flex-start}.meta{display:grid;place-items:center;gap:4px;padding:8px;border-left:1px solid rgba(255,255,255,.08);border-right:1px solid rgba(255,255,255,.08);font-size:10px;letter-spacing:.12em}.meta small{color:var(--broadcast-accent-alt);font-weight:900}.meta b{font-size:12px}.meta em{font-style:normal;opacity:.5;font-size:8px}.leader{position:absolute;left:50%;bottom:7vh;transform:translateX(-50%);font-size:11px;letter-spacing:.3em;color:var(--broadcast-accent);opacity:.7}.connection{position:absolute;right:18px;top:18px;width:7px;height:7px;border-radius:50%;background:#ef4444;opacity:.3}.connection.live{background:#22c55e;opacity:.8;box-shadow:0 0 15px #22c55e}.score-pop .side strong{animation:pop .45s cubic-bezier(.16,1,.3,1)}.round-slam .bar{animation:slam .65s cubic-bezier(.16,1,.3,1)}.goal-burst .bar{animation:burst .6s}.ko-impact .bar{animation:ko .75s}.match-point .bar{animation:point .9s}.score-steady .bar{animation:fade .3s}@keyframes pop{0%{transform:scale(.65);opacity:.3}70%{transform:scale(1.18)}100%{transform:scale(1)}}@keyframes slam{0%{transform:translateX(-50%) translateY(-30px) scale(.9);opacity:0}100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}}@keyframes burst{0%,100%{box-shadow:0 18px 60px var(--broadcast-glow)}50%{box-shadow:0 0 100px var(--broadcast-accent)}}@keyframes ko{0%{transform:translateX(-50%) scale(1)}20%{transform:translateX(calc(-50% - 10px)) scale(1.03)}40%{transform:translateX(calc(-50% + 10px)) scale(.98)}60%{transform:translateX(calc(-50% - 6px)) scale(1.01)}100%{transform:translateX(-50%) scale(1)}}@keyframes point{from{filter:brightness(1)}50%{filter:brightness(1.8)}to{filter:brightness(1)}}@keyframes fade{from{opacity:.5}to{opacity:1}}@media(max-width:700px){.bar{grid-template-columns:1fr 85px 1fr;width:98vw}.side{padding:8px 9px;gap:7px;font-size:12px}.side strong{font-size:28px}.meta{font-size:7px}.meta b{font-size:8px}}`}</style>
    </main>
  );
}
