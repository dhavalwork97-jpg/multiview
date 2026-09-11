"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getBroadcastTheme } from "@/lib/broadcast/themes";
import { animationForScene } from "@/lib/broadcast/animations";
import {
  applyBroadcastOverlayEvent,
  createInitialOverlayState,
  getOverlayThemeVars,
  readNumber,
  readString,
  type BroadcastOverlayEvent,
  type BroadcastOverlayState,
} from "@/lib/broadcast/overlay-runtime";

export default function AnimatedBroadcastOverlay({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState("");
  const [game, setGame] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<BroadcastOverlayState | null>(null);

  useEffect(() => {
    let mounted = true;
    void params.then(({ tournamentId: id }) => {
      if (!mounted) return;
      setTournamentId(id);
      setGame(new URLSearchParams(window.location.search).get("game"));
      setState(createInitialOverlayState(id));
    });
    return () => { mounted = false; };
  }, [params]);

  useEffect(() => {
    if (!tournamentId) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || window.location.origin;
    const socket: Socket = io(socketUrl, { transports: ["websocket", "polling"] });
    const onConnect = () => { setConnected(true); socket.emit("join:tournament", tournamentId); };
    const onDisconnect = () => setConnected(false);
    const onBroadcast = (event: BroadcastOverlayEvent) => setState((current) => current ? applyBroadcastOverlayEvent(current, event) : current);
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
  const overlay = current.overlay;
  const teamA = readString(overlay?.teamA ?? overlay?.playerOne, "TEAM A");
  const teamB = readString(overlay?.teamB ?? overlay?.playerTwo, "TEAM B");
  const scoreA = readNumber(overlay?.scoreA ?? overlay?.playerOneScore);
  const scoreB = readNumber(overlay?.scoreB ?? overlay?.playerTwoScore);
  const title = readString(overlay?.title, theme.label);
  const subtitle = readString(overlay?.subtitle, "FGC BROADCAST");
  const seconds = Math.max(0, Math.ceil(readNumber(overlay?.seconds, 5)));
  const winner = readString(overlay?.winner, teamA);
  const sponsor = typeof overlay?.sponsor === "object" && overlay.sponsor !== null ? overlay.sponsor as Record<string, unknown> : null;
  const clip = typeof overlay?.clip === "object" && overlay.clip !== null ? overlay.clip as Record<string, unknown> : null;
  const animation = animationForScene(current.scene);

  return (
    <main className={`stage anim-${animation}`} style={getOverlayThemeVars(theme)}>
      <div className="ambient ambient-a" /><div className="ambient ambient-b" />
      {current.scene === "starting-soon" && <section className="countdown"><div className="ring"><strong>{seconds}</strong></div><small>STARTING SOON</small><span>{subtitle}</span></section>}
      {current.scene === "intro" && <section className="intro"><small>{subtitle}</small><h1>{title}</h1><div>{teamA}<b>VS</b>{teamB}</div></section>}
      {current.scene === "versus" && <section className="vs"><div className="team team-a">{teamA}</div><b>VS</b><div className="team team-b">{teamB}</div></section>}
      {current.scene === "gameplay" && <section className="score"><div>{teamA}<strong>{scoreA}</strong></div><small>{theme.label}</small><div><strong>{scoreB}</strong>{teamB}</div></section>}
      {current.scene === "replay" && <section className="replay"><small>INSTANT REPLAY</small><h2>{readString(clip?.title, "Highlight")}</h2><b>REPLAY</b></section>}
      {current.scene === "winner" && <section className="winner"><div className="burst" /><small>MATCH WINNER</small><h1>{winner}</h1><span>{scoreA} — {scoreB}</span></section>}
      {current.scene === "champion" && <section className="winner champion"><div className="burst" /><small>TOURNAMENT CHAMPION</small><h1>{winner}</h1><span>{title}</span></section>}
      {current.scene === "brb" && <section className="brb"><small>FGC BROADCAST</small><h1>BE RIGHT BACK</h1><span>WE&apos;LL BE LIVE AGAIN SHORTLY</span></section>}
      {current.scene === "timeout" && <section className="timeout"><small>TIMEOUT</small><h1>TECHNICAL BREAK</h1><span>PLEASE STAND BY</span></section>}
      {sponsor && current.scene === "gameplay" && <section className="sponsor"><small>POWERED BY</small><strong>{readString(sponsor.name, "Sponsor")}</strong></section>}
      <i className={`connection ${connected ? "live" : ""}`} />
      <style jsx>{` .stage{position:relative;width:100vw;height:100vh;overflow:hidden;background:transparent;color:var(--broadcast-text);font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;pointer-events:none}.ambient{position:absolute;width:75vw;height:35vh;background:radial-gradient(circle,var(--broadcast-glow),transparent 68%);filter:blur(35px);opacity:.7}.ambient-a{left:-25vw;bottom:-15vh}.ambient-b{right:-25vw;top:-15vh}.connection{position:absolute;right:14px;top:14px;width:7px;height:7px;border-radius:50%;background:#ef4444;opacity:.25}.connection.live{background:#22c55e;opacity:.8;box-shadow:0 0 15px #22c55e}small{font-size:11px;font-weight:900;letter-spacing:.28em;color:var(--broadcast-accent-alt)} .countdown,.intro,.winner,.brb,.timeout{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;justify-items:center;text-align:center}.ring{display:grid;place-items:center;width:min(28vw,320px);height:min(28vw,320px);border:2px solid var(--broadcast-accent);border-radius:50%;box-shadow:0 0 90px var(--broadcast-glow),inset 0 0 70px var(--broadcast-glow)}.ring strong{font-size:clamp(100px,15vw,190px);color:var(--broadcast-accent);line-height:1}.countdown>span,.brb span,.timeout span{margin-top:18px;font-size:12px;font-weight:900;letter-spacing:.22em;opacity:.7} .intro h1,.winner h1,.brb h1,.timeout h1{margin:18px 0;font-size:clamp(56px,9vw,145px);line-height:.8}.intro>div{display:flex;gap:28px;align-items:center;font-size:clamp(20px,3vw,42px);font-weight:1000}.intro b,.vs>b{color:var(--broadcast-accent);font-style:italic}.vs{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:5vw;font-size:clamp(42px,7vw,110px);font-weight:1000}.team{min-width:25vw;padding:24px 32px;border-top:1px solid var(--broadcast-accent);border-bottom:1px solid var(--broadcast-accent);background:color-mix(in srgb,var(--broadcast-surface) 88%,transparent)}.team-b{text-align:right} .score{position:absolute;top:5vh;left:50%;transform:translateX(-50%);min-width:min(88vw,1100px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:10px;background:color-mix(in srgb,var(--broadcast-surface) 94%,transparent);border:1px solid var(--broadcast-accent);box-shadow:0 18px 55px var(--broadcast-glow);backdrop-filter:blur(14px)}.score>div{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 22px;font-size:clamp(15px,2vw,27px);font-weight:900}.score>div:last-child{justify-content:flex-start}.score strong{font-size:clamp(30px,3vw,48px);color:var(--broadcast-accent)}.score>small{padding:0 20px;opacity:.7} .replay,.sponsor{position:absolute;right:6vw;bottom:8vh;display:grid;gap:7px;padding:18px 24px;background:color-mix(in srgb,var(--broadcast-surface) 94%,transparent);border-right:4px solid var(--broadcast-accent);box-shadow:0 14px 50px var(--broadcast-glow)}.replay h2,.sponsor strong{margin:0;font-size:26px}.replay b{font-size:9px;letter-spacing:.3em;color:var(--broadcast-accent)}.winner{min-width:55vw;padding:58px 76px;background:color-mix(in srgb,var(--broadcast-surface) 95%,transparent);border:1px solid var(--broadcast-accent);box-shadow:0 25px 100px var(--broadcast-glow);overflow:hidden}.burst{position:absolute;inset:-120%;background:conic-gradient(from 0deg,transparent,var(--broadcast-accent),transparent 24%,transparent 50%,var(--broadcast-accent-alt),transparent 75%);opacity:.09;animation:spin 9s linear infinite}.winner>*:not(.burst){position:relative}.winner span{font-size:24px;font-weight:900}.champion{min-width:62vw}.brb,.timeout{min-width:50vw;padding:50px;background:color-mix(in srgb,var(--broadcast-surface) 94%,transparent);border-bottom:5px solid var(--broadcast-accent)} .anim-fade-in{animation:fade .45s both}.anim-scale-in{animation:scale .55s both}.anim-versus-slam .vs>b{animation:slam .9s both}.anim-countdown-pulse .ring{animation:pulse .85s ease-in-out infinite alternate}.anim-winner-burst .winner{animation:winner 1.1s both}.anim-replay-sweep .replay{animation:sweep .7s both}.anim-slide-up .lower{animation:up .65s both} @keyframes fade{from{opacity:0}to{opacity:1}}@keyframes scale{from{opacity:0;transform:translate(-50%,-50%) scale(.75)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}@keyframes slam{0%{opacity:0;transform:scale(2.4) rotate(-8deg)}65%{opacity:1;transform:scale(.9) rotate(2deg)}100%{transform:scale(1)}}@keyframes pulse{from{transform:scale(.97);box-shadow:0 0 40px var(--broadcast-glow),inset 0 0 30px var(--broadcast-glow)}to{transform:scale(1.04);box-shadow:0 0 110px var(--broadcast-glow),inset 0 0 90px var(--broadcast-glow)}}@keyframes winner{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}55%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}100%{transform:translate(-50%,-50%) scale(1)}}@keyframes sweep{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}@keyframes up{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}} @media(max-width:700px){.score{min-width:96vw}.score>div{padding:9px 7px;gap:7px;font-size:12px}.score>small{padding:0 7px}.team{min-width:29vw;padding:15px 9px;font-size:26px}.winner{min-width:80vw;padding:32px 22px}.brb,.timeout{min-width:80vw;padding:28px 20px}}`}</style>
    </main>
  );
}
