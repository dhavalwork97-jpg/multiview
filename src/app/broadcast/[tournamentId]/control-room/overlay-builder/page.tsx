"use client";

import { useEffect, useMemo, useState } from "react";
import { BROADCAST_THEMES, getBroadcastTheme, type BroadcastThemeId } from "@/lib/broadcast/themes";
import { DEFAULT_OVERLAY_CONFIG, normalizeOverlayConfig, type BroadcastOverlayConfig, type OverlayElementKind, type OverlayPosition } from "@/lib/broadcast/overlay-builder";

const kinds: OverlayElementKind[] = ["scoreboard", "lower-third", "countdown", "versus", "winner", "replay", "sponsor", "program"];
const positions: OverlayPosition[] = ["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"];

type StateResponse = { persistent?: { overlayConfig?: BroadcastOverlayConfig } };

export default function OverlayBuilderPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState("");
  const [game, setGame] = useState<string | null>(null);
  const [config, setConfig] = useState<BroadcastOverlayConfig>(DEFAULT_OVERLAY_CONFIG);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then(async ({ tournamentId: id }) => {
      setTournamentId(id);
      const gameValue = new URLSearchParams(window.location.search).get("game");
      setGame(gameValue);
      try {
        const response = await fetch(`/api/broadcast/state?tournamentId=${encodeURIComponent(id)}`, { cache: "no-store" });
        const payload = (await response.json()) as StateResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load overlay settings");
        setConfig(normalizeOverlayConfig(payload.persistent?.overlayConfig ?? { themeId: getBroadcastTheme(gameValue).id }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load overlay settings");
        setConfig(normalizeOverlayConfig({ themeId: getBroadcastTheme(gameValue).id }));
      } finally { setLoading(false); }
    });
  }, [params]);

  const theme = useMemo(() => BROADCAST_THEMES[config.themeId] ?? getBroadcastTheme(game), [config.themeId, game]);
  const patch = (next: Partial<BroadcastOverlayConfig>) => { setConfig((current) => normalizeOverlayConfig({ ...current, ...next })); setSaved(false); };
  const updateElement = (kind: OverlayElementKind, next: Record<string, unknown>) => { setConfig((current) => normalizeOverlayConfig({ ...current, elements: current.elements.map((item) => item.kind === kind ? { ...item, ...next } : item) })); setSaved(false); };
  async function save() {
    if (!tournamentId) return;
    setError(null);
    try {
      const response = await fetch("/api/broadcast/state", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, patch: { overlayConfig: config } }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to save overlay settings");
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save overlay settings"); }
  }
  async function reset() {
    const next = normalizeOverlayConfig({ themeId: getBroadcastTheme(game).id });
    setConfig(next);
    setSaved(false);
    if (!tournamentId) return;
    try { await fetch("/api/broadcast/state", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tournamentId, patch: { overlayConfig: next } }) }); } catch { setError("Unable to reset overlay settings"); }
  }

  return <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter,system-ui,sans-serif" }}><div style={{ maxWidth: 1280, margin: "0 auto" }}>
    <header style={header}><div><div style={eyebrow}>FGC BROADCAST STUDIO · V33</div><h1 style={title}>Overlay Builder</h1><p style={muted}>Native broadcast customization with durable tournament settings and a live production preview.</p></div><a href={`/broadcast/${tournamentId}/control-room`} style={link}>← CONTROL ROOM</a></header>
    {error && <div style={errorBox}>{error}</div>}
    <div style={layout}>
      <aside style={panel}>
        <div style={eyebrow}>THEME</div><h2 style={sectionTitle}>Visual system</h2>
        <label style={label}>GAME THEME<select value={config.themeId} disabled={loading} onChange={(e) => patch({ themeId: e.target.value as BroadcastThemeId })} style={input}>{Object.values(BROADCAST_THEMES).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label style={label}>PRIMARY ACCENT<input value={config.customAccent ?? theme.accent} onChange={(e) => patch({ customAccent: e.target.value })} style={input} /></label>
        <label style={label}>SECONDARY ACCENT<input value={config.customAccentAlt ?? theme.accentAlt} onChange={(e) => patch({ customAccentAlt: e.target.value })} style={input} /></label>
        <label style={label}>SURFACE OPACITY<input type="range" min="0.55" max="1" step=".01" value={config.surfaceOpacity} onChange={(e) => patch({ surfaceOpacity: Number(e.target.value) })} /></label>
        <label style={label}>FONT<select value={config.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })} style={input}><option>Inter, system-ui, sans-serif</option><option>Arial, Helvetica, sans-serif</option><option>system-ui, sans-serif</option></select></label>
        <div style={{ ...eyebrow, marginTop: 24 }}>ELEMENTS & PLACEMENT</div>
        <div style={{ display: "grid", gap: 9, marginTop: 10 }}>{kinds.map((kind) => { const item = config.elements.find((entry) => entry.kind === kind)!; return <div key={kind} style={controlRow}><label style={{ flex: 1, fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const }}><input type="checkbox" checked={item.enabled} onChange={(e) => updateElement(kind, { enabled: e.target.checked })} /> {kind.replace("-", " ")}</label><select value={item.position} onChange={(e) => updateElement(kind, { position: e.target.value })} style={miniInput}>{positions.map((position) => <option key={position}>{position}</option>)}</select></div>})}</div>
        <div style={{ ...eyebrow, marginTop: 24 }}>SPONSOR PLACEMENT</div>
        <label style={label}>SPONSOR LOGO URL<input value={config.sponsor.logoUrl ?? ""} onChange={(e) => patch({ sponsor: { ...config.sponsor, logoUrl: e.target.value || null } })} placeholder="https://…" style={input} /></label>
        <label style={label}>SPONSOR POSITION<select value={config.sponsor.position} onChange={(e) => patch({ sponsor: { ...config.sponsor, position: e.target.value as OverlayPosition } })} style={input}>{positions.map((position) => <option key={position}>{position}</option>)}</select></label>
        <label style={label}><input type="checkbox" checked={config.sponsor.enabled} onChange={(e) => patch({ sponsor: { ...config.sponsor, enabled: e.target.checked } })} /> ENABLE SPONSOR GRAPHIC</label>
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}><button onClick={() => void save()} disabled={loading} style={button}>SAVE CONFIG</button><button onClick={() => void reset()} style={secondary}>RESET</button>{saved && <span style={savedText}>Saved to tournament</span>}</div>
      </aside>
      <section style={previewShell}><div style={previewToolbar}><span>LIVE PREVIEW · {theme.label.toUpperCase()}</span><span>{game || "FGC BROADCAST"}</span></div><Preview config={config} theme={theme} /></section>
    </div>
  </div></main>;
}

function Preview({ config, theme }: { config: BroadcastOverlayConfig; theme: ReturnType<typeof getBroadcastTheme> }) {
  const enabled = (kind: OverlayElementKind) => config.elements.find((item) => item.kind === kind);
  const vars = { "--a": config.customAccent || theme.accent, "--b": config.customAccentAlt || theme.accentAlt, "--s": `color-mix(in srgb, ${theme.surface} ${Math.round(config.surfaceOpacity * 100)}%, transparent)`, "--t": theme.text } as React.CSSProperties;
  return <div style={{ ...canvas, ...vars, fontFamily: config.fontFamily }}><div style={glow(theme.glow)} />
    {enabled("scoreboard")?.enabled && <div style={{ ...scoreboard, ...pos(enabled("scoreboard")!.position) }}><strong>TEAM ALPHA</strong><b>2</b><span>{theme.label}</span><b>1</b><strong>TEAM OMEGA</strong></div>}
    {enabled("lower-third")?.enabled && <div style={{ ...lower, ...pos(enabled("lower-third")!.position) }}><small>PLAYER INTRO</small><strong>TEAM ALPHA</strong><span>CAPTAIN · VS · OMEGA</span></div>}
    {enabled("countdown")?.enabled && <div style={{ ...countdown, ...pos(enabled("countdown")!.position) }}><small>STARTING SOON</small><strong>05</strong></div>}
    {enabled("versus")?.enabled && <div style={{ ...versus, ...pos(enabled("versus")!.position) }}><strong>ALPHA</strong><b>VS</b><strong>OMEGA</strong></div>}
    {enabled("winner")?.enabled && <div style={{ ...winner, ...pos(enabled("winner")!.position) }}><small>MATCH WINNER</small><strong>TEAM ALPHA</strong></div>}
    {enabled("replay")?.enabled && <div style={{ ...replay, ...pos(enabled("replay")!.position) }}><small>REPLAY</small><strong>CLUTCH MOMENT</strong></div>}
    {enabled("sponsor")?.enabled && config.sponsor.enabled && <div style={{ ...sponsor, ...pos(config.sponsor.position) }}><small>{config.sponsor.label}</small>{config.sponsor.logoUrl ? <img src={config.sponsor.logoUrl} alt="Sponsor" style={sponsorLogo} /> : <strong>YOUR SPONSOR</strong>}</div>}
    {enabled("program")?.enabled && <div style={{ ...program, ...pos(enabled("program")!.position) }}><small>PROGRAM</small><strong>FGC BROADCAST</strong></div>}
  </div>;
}

function pos(position: OverlayPosition): React.CSSProperties { const map: Record<OverlayPosition, React.CSSProperties> = { "top-left": { top: "6%", left: "5%" }, "top-center": { top: "6%", left: "50%", transform: "translateX(-50%)" }, "top-right": { top: "6%", right: "5%" }, center: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }, "bottom-left": { bottom: "8%", left: "5%" }, "bottom-center": { bottom: "6%", left: "50%", transform: "translateX(-50%)" }, "bottom-right": { bottom: "8%", right: "5%" } }; return map[position]; }
function glow(value: string): React.CSSProperties { return { position: "absolute", inset: "auto 0 0", height: "50%", background: `radial-gradient(circle at 50% 100%,${value},transparent 70%)`, pointerEvents: "none" }; }
const header = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, marginBottom: 22 } as const;
const layout = { display: "grid", gridTemplateColumns: "360px 1fr", gap: 18, alignItems: "start" } as const;
const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 } as const;
const previewShell = { ...panel, minWidth: 0 } as const;
const previewToolbar = { display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: ".15em", opacity: .5, marginBottom: 12 } as const;
const canvas = { position: "relative", aspectRatio: "16/9", overflow: "hidden", borderRadius: 14, background: "#080910", color: "var(--t)", border: "1px solid #252936" } as React.CSSProperties;
const scoreboard = { position: "absolute", display: "grid", gridTemplateColumns: "1fr auto auto auto 1fr", alignItems: "center", gap: 14, padding: "12px 18px", minWidth: "72%", background: "var(--s)", border: "1px solid var(--a)", borderRadius: 8 } as React.CSSProperties;
const lower = { position: "absolute", display: "grid", gap: 4, padding: "12px 18px", minWidth: 250, borderLeft: "4px solid var(--a)", background: "var(--s)" } as React.CSSProperties;
const countdown = { position: "absolute", display: "grid", justifyItems: "center" } as React.CSSProperties;
const versus = { position: "absolute", display: "flex", gap: 28, alignItems: "center", fontSize: 24 } as React.CSSProperties;
const winner = { position: "absolute", display: "grid", justifyItems: "center", padding: "26px 40px", background: "var(--s)", border: "1px solid var(--a)", borderRadius: 10 } as React.CSSProperties;
const replay = { position: "absolute", display: "grid", gap: 3, padding: "10px 14px", background: "var(--s)", borderRight: "3px solid var(--a)" } as React.CSSProperties;
const sponsor = { position: "absolute", display: "grid", gap: 5, padding: "10px 14px", background: "var(--s)", borderRight: "3px solid var(--b)" } as React.CSSProperties;
const sponsorLogo = { maxWidth: 120, maxHeight: 34, objectFit: "contain" as const };
const program = { position: "absolute", display: "grid", justifyItems: "center", gap: 2, opacity: .75 } as React.CSSProperties;
const eyebrow = { fontSize: 10, letterSpacing: ".18em", opacity: .45 } as const;
const title = { fontSize: 34, margin: "7px 0 0" } as const;
const sectionTitle = { fontSize: 17, margin: "6px 0 18px" } as const;
const muted = { margin: "7px 0 0", fontSize: 12, opacity: .5 } as const;
const label = { display: "grid", gap: 7, marginBottom: 14, fontSize: 10, letterSpacing: ".1em", opacity: .7 } as const;
const input = { width: "100%", boxSizing: "border-box" as const, padding: "10px 11px", borderRadius: 8, border: "1px solid #2b2f3c", background: "#080a10", color: "white" } as const;
const miniInput = { padding: "6px 7px", borderRadius: 7, border: "1px solid #2b2f3c", background: "#080a10", color: "white", fontSize: 10 } as const;
const controlRow = { display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9, background: "#10131b", border: "1px solid #252936" } as const;
const button = { border: 0, borderRadius: 9, background: "#7c3aed", color: "white", padding: "10px 15px", fontWeight: 800, cursor: "pointer" } as const;
const secondary = { border: "1px solid #2b2f3c", borderRadius: 9, background: "#11131a", color: "white", padding: "10px 15px", fontWeight: 800, cursor: "pointer" } as const;
const savedText = { fontSize: 11, color: "#22c55e", alignSelf: "center" } as const;
const errorBox = { marginBottom: 16, padding: 12, borderRadius: 10, border: "1px solid #63323c", background: "#1a1014", color: "#fda4af", fontSize: 12 } as const;
const link = { color: "#c4b5fd", textDecoration: "none", fontSize: 11, letterSpacing: ".12em" } as const;
