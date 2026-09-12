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
  const scene = current.scene || "starting-soon";
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
  // Older saved overlay configs do not contain the newer intro element. A missing element is therefore enabled by default; explicit false still disables it.
  const visible = (target: BroadcastOverlayKind) => kind === target && element(target)?.enabled !== false;
  const elementStyle = (target: BroadcastOverlayKind): React.CSSProperties => positionStyle(element(target)?.position ?? "center");
  const sponsorVisible = visible("sponsor") && config.sponsor.enabled;
  const sponsorName = readString(sponsor?.name, "Sponsor");
  const sponsorLogo = readString(sponsor?.logoUrl, config.sponsor.logoUrl || "");
  const isGameplay = scene === "gameplay";
  const isIntermission = scene === "brb" || scene === "timeout";
  const isSceneGraphic = ["starting-soon", "intro", "versus", "brb", "timeout", "winner", "champion"].includes(scene);

  return (
    <main className={`fgc-overlay-root overlay ${isGameplay ? "is-gameplay" : "is-fullscreen"}`} style={{ ...getOverlayThemeVars(theme), fontFamily: config.fontFamily }} aria-label={`FGC broadcast ${scene}`}>
      {!isGameplay && <div className="backdrop" aria-hidden="true" />}
      {!isGameplay && <div className="glow" aria-hidden="true" />}

      {visible("scoreboard") && isGameplay && <section className="scoreboard" style={elementStyle("scoreboard")}><div className="team left"><span>{teamA}</span><b>{scoreA}</b></div><span className="game">{theme.label}</span><div className="team"><b>{scoreB}</b><span>{teamB}</span></div></section>}

      {visible("lower-third") && ["intro", "versus"].includes(scene) && <section className="lower" style={elementStyle("lower-third")}><small>{subtitle}</small><strong>{title}</strong><span>{teamA} <i>VS</i> {teamB}</span></section>}

      {visible("countdown") && scene === "starting-soon" && <section className="countdown" style={elementStyle("countdown")}><div className="eyebrow">STARTING SOON</div><strong>{seconds}</strong><span>{title}</span><small>{subtitle}</small></section>}

      {visible("intro") && scene === "intro" && <section className="center intro-card" style={elementStyle("intro")}><small>{subtitle}</small><h1>{title}</h1><p>{teamA} <i>VS</i> {teamB}</p></section>}

      {visible("versus") && scene === "versus" && <section className="versus" style={elementStyle("versus")}><div className="versus-player left-player">{teamA}</div><b>VS</b><div className="versus-player right-player">{teamB}</div></section>}

      {visible("winner") && ["winner", "champion"].includes(scene) && <section className="winner" style={elementStyle("winner")}><small>{scene === "champion" ? "CHAMPION" : "MATCH WINNER"}</small><h1>{winner}</h1><span>{scoreA} — {scoreB}</span><strong>{title}</strong></section>}

      {visible("replay") && scene === "replay" && <section className="replay" style={elementStyle("replay")}><small>REPLAY</small><strong>{readString(clip?.title, "Instant Replay")}</strong></section>}

      {sponsorVisible && isGameplay && <section className="sponsor" style={positionStyle(config.sponsor.position)}><small>{config.sponsor.label}</small>{sponsorLogo ? <img src={sponsorLogo} alt="Sponsor" /> : <strong>{sponsorName}</strong>}</section>}

      {visible("program") && (isIntermission || !isSceneGraphic) && <section className={`program ${isIntermission ? "intermission" : ""}`} style={isIntermission ? positionStyle("center") : elementStyle("program")}><small>{isIntermission ? (scene === "timeout" ? "TIMEOUT" : "BE RIGHT BACK") : scene.replaceAll("-", " ").toUpperCase()}</small><strong>{isIntermission ? "FGC BROADCAST" : title}</strong>{isIntermission && <span>{subtitle}</span>}{!isIntermission && <span>{teamA} <i>VS</i> {teamB}</span>}</section>}

      <div className={`sync ${connected ? "on" : ""}`} aria-hidden="true" />

      <style jsx>{`
        .overlay{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:transparent;color:var(--broadcast-text);font-family:Arial,Helvetica,sans-serif;pointer-events:none;text-transform:uppercase;isolation:isolate}.backdrop{position:absolute;inset:0;background:radial-gradient(circle at 50% 110%,color-mix(in srgb,var(--broadcast-accent) 25%,transparent),transparent 45%),radial-gradient(circle at 8% 18%,color-mix(in srgb,var(--broadcast-accent-alt) 10%,transparent),transparent 35%),linear-gradient(135deg,#050713 0%,#070a1d 52%,#03050d 100%);z-index:-3}.backdrop::before{content:"";position:absolute;inset:0;opacity:.22;background-image:linear-gradient(color-mix(in srgb,var(--broadcast-accent-alt) 14%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--broadcast-accent-alt) 14%,transparent) 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(to bottom,black,transparent 88%)}.glow{position:absolute;left:50%;bottom:-32%;width:80%;height:70%;transform:translateX(-50%);background:radial-gradient(circle,var(--broadcast-glow),transparent 65%);filter:blur(30px);z-index:-2}small,.eyebrow{font-size:11px;font-weight:900;letter-spacing:.22em;color:var(--broadcast-accent-alt)}.scoreboard{position:absolute;min-width:min(88%,1100px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:10px;background:color-mix(in srgb,var(--broadcast-surface) 94%,transparent);border:1px solid color-mix(in srgb,var(--broadcast-accent) 75%,transparent);box-shadow:0 18px 55px var(--broadcast-glow);backdrop-filter:blur(14px)}.team{display:flex;justify-content:flex-start;align-items:center;gap:18px;padding:14px 22px;font-size:clamp(16px,2vw,27px);font-weight:900}.team.left{justify-content:flex-end;border-right:1px solid color-mix(in srgb,var(--broadcast-accent-alt) 35%,transparent)}.team b{font-size:clamp(28px,3vw,44px);color:var(--broadcast-accent)}.game{padding:0 22px;font-size:10px;font-weight:900;letter-spacing:.18em;opacity:.7;white-space:nowrap}.lower{position:absolute;display:grid;gap:6px;min-width:420px;padding:18px 28px;border-left:5px solid var(--broadcast-accent);background:linear-gradient(90deg,color-mix(in srgb,var(--broadcast-surface) 95%,transparent),transparent);box-shadow:0 16px 50px var(--broadcast-glow)}.lower strong{font-size:clamp(30px,4vw,58px);line-height:.9}.lower span,.program span{font-size:14px;font-weight:800;opacity:.72}.lower i,.program i,.center i{color:var(--broadcast-accent);font-style:normal;margin:0 8px}.countdown,.center,.winner,.program{position:absolute;display:grid;justify-items:center;text-align:center}.countdown{gap:12px}.countdown strong{font-size:clamp(120px,20vw,280px);line-height:.72;color:var(--broadcast-accent);text-shadow:0 0 45px var(--broadcast-glow)}.countdown span{font-size:clamp(20px,3vw,40px);font-weight:900;letter-spacing:.04em}.intro-card{min-width:min(80vw,1100px);gap:12px}.center h1,.winner h1{margin:15px 0;font-size:clamp(52px,9vw,140px);line-height:.8}.center p,.winner span{font-size:clamp(18px,2.5vw,34px);font-weight:900}.versus{position:absolute;width:min(94%,1700px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:clamp(18px,4vw,80px);text-align:center}.versus-player{padding:clamp(22px,4vw,60px);font-size:clamp(38px,6vw,100px);font-weight:900;line-height:.85;background:color-mix(in srgb,var(--broadcast-surface) 92%,transparent);border-top:2px solid color-mix(in srgb,var(--broadcast-accent) 80%,transparent);border-bottom:2px solid color-mix(in srgb,var(--broadcast-accent-alt) 35%,transparent);box-shadow:0 25px 80px var(--broadcast-glow)}.left-player{text-align:right}.right-player{text-align:left}.versus>b{font-size:clamp(44px,7vw,120px);color:var(--broadcast-accent);font-style:italic;text-shadow:0 0 45px var(--broadcast-glow)}.winner{min-width:min(72%,1200px);padding:clamp(34px,5vw,70px);gap:8px;background:color-mix(in srgb,var(--broadcast-surface) 94%,transparent);border:1px solid color-mix(in srgb,var(--broadcast-accent) 80%,transparent);box-shadow:0 24px 90px var(--broadcast-glow)}.winner strong{margin-top:12px;font-size:12px;letter-spacing:.2em;opacity:.65}.replay,.sponsor{position:absolute;display:grid;gap:6px;padding:16px 22px;background:color-mix(in srgb,var(--broadcast-surface) 92%,transparent);border-right:4px solid var(--broadcast-accent);box-shadow:0 12px 40px var(--broadcast-glow)}.replay strong,.sponsor strong{font-size:22px}.sponsor img{max-width:180px;max-height:60px;object-fit:contain}.program{gap:8px}.program.intermission{min-width:min(76%,1000px);padding:clamp(28px,5vw,64px);gap:14px;background:color-mix(in srgb,var(--broadcast-surface) 92%,transparent);border:1px solid color-mix(in srgb,var(--broadcast-accent) 60%,transparent);box-shadow:0 28px 90px var(--broadcast-glow)}.program.intermission strong{font-size:clamp(44px,7vw,110px);line-height:.82}.sync{position:absolute;right:14px;top:14px;width:6px;height:6px;border-radius:50%;background:#ef4444;opacity:.3}.sync.on{background:#22c55e;opacity:.75;box-shadow:0 0 12px #22c55e}.is-gameplay .sync{opacity:.16}@media(max-width:700px){.scoreboard{min-width:96%}.team{padding:9px 7px;gap:7px;font-size:12px}.game{padding:0 7px;font-size:8px}.lower{min-width:0;max-width:90%}.versus{gap:8px}.versus-player{padding:18px 10px}.winner{min-width:82%}}
      `}</style>
    </main>
  );
}

function positionStyle(position: OverlayPosition): React.CSSProperties {
  const map: Record<OverlayPosition, React.CSSProperties> = { "top-left": { top: "6%", left: "5%" }, "top-center": { top: "6%", left: "50%", transform: "translateX(-50%)" }, "top-right": { top: "6%", right: "5%" }, center: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }, "bottom-left": { bottom: "8%", left: "5%" }, "bottom-center": { bottom: "6%", left: "50%", transform: "translateX(-50%)" }, "bottom-right": { bottom: "8%", right: "5%" } };
  return map[position];
}
