"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getBroadcastTheme } from "@/lib/broadcast/themes";
import { applyBroadcastOverlayEvent, createInitialOverlayState, readNumber, readString, getOverlayThemeVars, type BroadcastOverlayEvent, type BroadcastOverlayKind, type BroadcastOverlayState } from "@/lib/broadcast/overlay-runtime";
import { DEFAULT_OVERLAY_CONFIG, normalizeOverlayConfig, type BroadcastOverlayConfig, type OverlayPosition } from "@/lib/broadcast/overlay-builder";

const KINDS: BroadcastOverlayKind[] = ["scoreboard", "lower-third", "countdown", "intro", "versus", "winner", "replay", "sponsor", "program"];
function parseKind(value: string | null): BroadcastOverlayKind { return value && KINDS.includes(value as BroadcastOverlayKind) ? (value as BroadcastOverlayKind) : "program"; }

export default function BroadcastOverlayPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState("");
  const [kind, setKind] = useState<BroadcastOverlayKind>("program");
  const [game, setGame] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<BroadcastOverlayState | null>(null);
  const [config, setConfig] = useState<BroadcastOverlayConfig>(DEFAULT_OVERLAY_CONFIG);

  useEffect(() => {
    let mounted = true;
    void params.then(async ({ tournamentId: id }) => {
      if (!mounted) return;
      const search = new URLSearchParams(window.location.search);
      setTournamentId(id); setKind(parseKind(search.get("kind"))); setGame(search.get("game")); setState(createInitialOverlayState(id));
      try {
        const [publicResponse, stateResponse] = await Promise.all([
          fetch(`/api/broadcast/public-state?tournamentId=${encodeURIComponent(id)}`, { cache: "no-store" }),
          fetch(`/api/broadcast/state?tournamentId=${encodeURIComponent(id)}`, { cache: "no-store" }),
        ]);
        if (publicResponse.ok) { const payload = (await publicResponse.json()) as { state?: BroadcastOverlayState }; if (payload.state) setState(payload.state); }
        if (stateResponse.ok) { const payload = (await stateResponse.json()) as { persistent?: { overlayConfig?: BroadcastOverlayConfig } }; if (payload.persistent?.overlayConfig) setConfig(normalizeOverlayConfig(payload.persistent.overlayConfig)); }
      } catch { /* socket remains the live path */ }
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
    socket.on("connect", onConnect); socket.on("disconnect", onDisconnect); socket.on("broadcast:updated", onBroadcast);
    return () => { socket.emit("leave:tournament", tournamentId); socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off("broadcast:updated", onBroadcast); socket.disconnect(); };
  }, [tournamentId]);

  const baseTheme = useMemo(() => getBroadcastTheme(game), [game]);
  const theme = useMemo(() => ({ ...baseTheme, accent: config.customAccent || baseTheme.accent, accentAlt: config.customAccentAlt || baseTheme.accentAlt }), [baseTheme, config.customAccent, config.customAccentAlt]);
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
  const clip = typeof overlay?.replayClip === "object" && overlay.replayClip !== null ? overlay.replayClip as Record<string, unknown> : typeof overlay?.clip === "object" && overlay.clip !== null ? overlay.clip as Record<string, unknown> : null;
  const element = (target: BroadcastOverlayKind) => config.elements.find((item) => item.kind === target);
  const visible = (target: BroadcastOverlayKind) => kind === target && element(target)?.enabled !== false;
  const elementStyle = (target: BroadcastOverlayKind): React.CSSProperties => positionStyle(element(target)?.position ?? "center");
  const sponsorVisible = visible("sponsor") && config.sponsor.enabled;
  const sponsorName = readString(sponsor?.name, "Sponsor");
  const sponsorLogo = readString(sponsor?.logoUrl, config.sponsor.logoUrl || "");

  return (
    <main className="overlay" style={{ ...getOverlayThemeVars(theme), fontFamily: config.fontFamily }}>
      <div className="glow" />
      {visible("scoreboard") && current.scene === "gameplay" && <section className="scoreboard" style={elementStyle("scoreboard")}><div className="team left">{teamA}<b>{scoreA}</b></div><span className="game">{theme.label}</span><div className="team"><b>{scoreB}</b>{teamB}</div></section>}
      {visible("lower-third") && ["intro", "versus"].includes(current.scene) && <section className="lower" style={elementStyle("lower-third")}><small>{subtitle}</small><strong>{title}</strong><span>{teamA} <i>VS</i> {teamB}</span></section>}
      {visible("countdown") && current.scene === "starting-soon" && <section className="countdown" style={elementStyle("countdown")}><small>STARTING SOON</small><strong>{seconds}</strong><span>{subtitle}</span></section>}
      {visible("intro") && current.scene === "intro" && <section className="center" style={elementStyle("intro")}><small>{subtitle}</small><h1>{title}</h1><p>{teamA} <i>VS</i> {teamB}</p></section>}
      {visible("versus") && current.scene === "versus" && <section className="versus" style={elementStyle("versus")}><strong>{teamA}</strong><b>VS</b><strong>{teamB}</strong></section>}
      {visible("winner") && ["winner", "champion"].includes(current.scene) && <section className="winner" style={elementStyle("winner")}><small>{current.scene === "champion" ? "CHAMPION" : "MATCH WINNER"}</small><h1>{winner}</h1><span>{scoreA} — {scoreB}</span></section>}
      {visible("replay") && current.scene === "replay" && <section className="replay" style={elementStyle("replay")}><small>REPLAY</small><strong>{readString(clip?.title, "Instant Replay")}</strong></section>}
      {sponsorVisible && current.scene === "gameplay" && <section className="sponsor" style={positionStyle(config.sponsor.position)}><small>{config.sponsor.label}</small>{sponsorLogo ? <img src={sponsorLogo} alt="Sponsor" /> : <strong>{sponsorName}</strong>}</section>}
      {visible("program") && <section className="program" style={elementStyle("program")}><small>{current.scene.replaceAll("-", " ").toUpperCase()}</small><strong>{title}</strong><span>{teamA} <i>VS</i> {teamB}</span></section>}
      <div className={`sync ${connected ? "on" : ""}`} />
      <style jsx>{`.overlay{position:relative;width:100vw;height:100vh;overflow:hidden;background:transparent;color:var(--broadcast-text);font-family:Arial,Helvetica,sans-serif;pointer-events:none;text-transform:uppercase}.glow{position:absolute;inset:auto -15vw -35vh;height:70vh;background:radial-gradient(circle,var(--broadcast-glow),transparent 65%);filter:blur(28px)}small{font-size:11px;font-weight:900;letter-spacing:.22em;color:var(--broadcast-accent-alt)}.scoreboard{position:absolute;min-width:min(88vw,1100px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:10px;background:color-mix(in srgb,var(--broadcast-surface) 94%,transparent);border:1px solid var(--broadcast-accent);box-shadow:0 18px 55px var(--broadcast-glow);backdrop-filter:blur(14px)}.team{display:flex;justify-content:flex-start;align-items:center;gap:18px;padding:14px 22px;font-size:clamp(16px,2vw,27px);font-weight:900}.team.left{justify-content:flex-end;border-right:1px solid color-mix(in srgb,var(--broadcast-accent-alt) 35%,transparent)}.team b{font-size:clamp(28px,3vw,44px);color:var(--broadcast-accent)}.game{padding:0 22px;font-size:10px;font-weight:900;letter-spacing:.18em;opacity:.7}.lower{position:absolute;display:grid;gap:6px;min-width:420px;padding:18px 28px;border-left:5px solid var(--broadcast-accent);background:linear-gradient(90deg,color-mix(in srgb,var(--broadcast-surface) 95%,transparent),transparent);box-shadow:0 16px 50px var(--broadcast-glow)}.lower strong{font-size:clamp(30px,4vw,58px);line-height:.9}.lower span,.program span{font-size:14px;font-weight:800;opacity:.72}.lower i,.program i,.center i{color:var(--broadcast-accent);font-style:normal;margin:0 8px}.countdown,.center,.winner{position:absolute;display:grid;justify-items:center;text-align:center}.countdown strong{font-size:clamp(120px,20vw,280px);line-height:.8;color:var(--broadcast-accent);text-shadow:0 0 45px var(--broadcast-glow)}.countdown span{margin-top:10px;font-size:12px;font-weight:900;letter-spacing:.2em;opacity:.7}.center h1,.winner h1{margin:15px 0;font-size:clamp(52px,9vw,140px);line-height:.8}.center p,.winner span{font-size:clamp(18px,2.5vw,34px);font-weight:900}.versus{position:absolute;display:flex;align-items:center;justify-content:center;gap:clamp(20px,6vw,100px);font-size:clamp(38px,7vw,110px)}.versus b{color:var(--broadcast-accent);font-style:italic;text-shadow:0 0 45px var(--broadcast-glow)}.winner{min-width:55vw;padding:50px 70px;background:color-mix(in srgb,var(--broadcast-surface) 94%,transparent);border:1px solid var(--broadcast-accent);box-shadow:0 24px 90px var(--broadcast-glow)}.replay,.sponsor{position:absolute;display:grid;gap:6px;padding:16px 22px;background:color-mix(in srgb,var(--broadcast-surface) 92%,transparent);border-right:4px solid var(--broadcast-accent);box-shadow:0 12px 40px var(--broadcast-glow)}.replay strong,.sponsor strong{font-size:22px}.sponsor img{max-width:180px;max-height:60px;object-fit:contain}.program{position:absolute;display:grid;justify-items:center;gap:8px;text-align:center}.program strong{font-size:clamp(25px,4vw,58px)}.sync{position:absolute;right:14px;top:14px;width:6px;height:6px;border-radius:50%;background:#ef4444;opacity:.3}.sync.on{background:#22c55e;opacity:.75;box-shadow:0 0 12px #22c55e}@media(max-width:700px){.scoreboard{min-width:96vw}.team{padding:9px 7px;gap:7px;font-size:12px}.game{padding:0 7px;font-size:8px}.lower{min-width:0;max-width:90vw}.winner{min-width:80vw;padding:30px 22px}}`}</style>
    </main>
  );
}

function positionStyle(position: OverlayPosition): React.CSSProperties {
  const map: Record<OverlayPosition, React.CSSProperties> = { "top-left": { top: "6%", left: "5%" }, "top-center": { top: "6%", left: "50%", transform: "translateX(-50%)" }, "top-right": { top: "6%", right: "5%" }, center: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }, "bottom-left": { bottom: "8%", left: "5%" }, "bottom-center": { bottom: "6%", left: "50%", transform: "translateX(-50%)" }, "bottom-right": { bottom: "8%", right: "5%" } };
  return map[position];
}
