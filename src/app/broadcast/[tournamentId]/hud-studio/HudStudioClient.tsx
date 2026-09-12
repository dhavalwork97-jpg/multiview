"use client";

import { useMemo, useState } from "react";
import { HUD_PACKAGES } from "@/lib/hud/packages";

type Props = { tournamentId: string };

const families = ["All", "Universal", "Fighting", "FPS", "MOBA", "Mobile"];

export default function HudStudioClient({ tournamentId }: Props) {
  const [family, setFamily] = useState("All");
  const [selected, setSelected] = useState("fgc-pro");
  const [installed, setInstalled] = useState("fgc-pro");
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const filtered = useMemo(() => HUD_PACKAGES.filter((p) => family === "All" || p.family === family), [family]);
  const selectedPackage = HUD_PACKAGES.find((p) => p.id === selected) ?? HUD_PACKAGES[0];
  const overlayUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/broadcast/${tournamentId}/overlay/hud/${selectedPackage.id}?station=main`;

  const installPackage = async () => {
    setInstalling(true);
    setInstallMessage("");
    try {
      const response = await fetch("/api/hud/install", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId, packageId: selectedPackage.id, stationId: "main" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not install HUD package");
      setInstalled(selectedPackage.id);
      setInstallMessage("Package installed. The OBS bridge will update the Browser Source automatically.");
    } catch (error) {
      setInstallMessage(error instanceof Error ? error.message : "Could not install HUD package");
    } finally {
      setInstalling(false);
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard?.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#08090c", color: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#f04444", fontWeight: 800 }}>FGC v33 / Broadcast</div>
            <h1 style={{ fontSize: 42, lineHeight: 1, margin: "10px 0 10px", letterSpacing: "-.04em" }}>HUD Studio</h1>
            <p style={{ color: "#9ca3af", maxWidth: 700, margin: 0 }}>Choose a package once. FGC serves the live graphics as OBS Browser Sources and keeps match data synchronized with the Control Room.</p>
          </div>
          <div style={{ padding: "10px 14px", border: "1px solid #26303b", background: "#0e1117", borderRadius: 12, fontSize: 12, color: "#9ca3af" }}>OBS READY · Browser Source architecture</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {families.map((item) => <button key={item} onClick={() => setFamily(item)} style={{ border: "1px solid #27303a", background: family === item ? "#f8fafc" : "#0e1117", color: family === item ? "#08090c" : "#9ca3af", borderRadius: 999, padding: "9px 15px", fontWeight: 750, cursor: "pointer" }}>{item}</button>)}
        </div>
        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14 }}>
            {filtered.map((pkg) => {
              const active = pkg.id === selected;
              return <button key={pkg.id} onClick={() => setSelected(pkg.id)} style={{ textAlign: "left", minHeight: 190, border: active ? `1px solid ${pkg.accent}` : "1px solid #202731", background: "#0d1015", borderRadius: 16, padding: 18, color: "inherit", cursor: "pointer", boxShadow: active ? `0 0 0 1px ${pkg.accent}22, inset 0 0 50px ${pkg.accent}10` : "none" }}>
                <div style={{ height: 82, borderRadius: 11, marginBottom: 16, background: `linear-gradient(135deg, ${pkg.accent} 0%, #10131a 48%, ${pkg.accent2} 140%)`, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", inset: 12, border: "1px solid #ffffff44", borderRadius: 8 }} /><div style={{ position: "absolute", left: 14, bottom: 10, fontSize: 10, letterSpacing: ".16em", fontWeight: 900 }}>FGC BROADCAST</div><div style={{ position: "absolute", right: 14, top: 12, fontFamily: "monospace", fontWeight: 900 }}>P1  2 — 1  P2</div></div>
                <div style={{ fontSize: 16, fontWeight: 850 }}>{pkg.name}</div><div style={{ color: "#737d8b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", marginTop: 4 }}>{pkg.family} · {pkg.games[0]}</div><p style={{ color: "#8f98a5", fontSize: 12, lineHeight: 1.45, margin: "10px 0 0" }}>{pkg.description}</p>
              </button>;
            })}
          </div>
          <aside style={{ border: "1px solid #242b34", background: "#0d1015", borderRadius: 18, padding: 20, height: "fit-content", position: "sticky", top: 20 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".15em", color: selectedPackage.accent, fontWeight: 900 }}>Selected package</div><h2 style={{ margin: "7px 0 5px", fontSize: 25 }}>{selectedPackage.name}</h2><p style={{ color: "#8f98a5", fontSize: 13, lineHeight: 1.5 }}>{selectedPackage.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "18px 0" }}>{[["MAIN HUD", "Live"], ["PLAYER INTRO", "Live"], ["WINNER", "Ready"], ["REPLAY", "Ready"], ["NEXT MATCH", "Ready"], ["BREAK", "Ready"]].map(([a,b]) => <div key={a} style={{ padding: 11, border: "1px solid #202731", borderRadius: 10, background: "#090b0f" }}><div style={{ fontSize: 9, color: "#687180", letterSpacing: ".1em" }}>{a}</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: "#b9c0ca" }}>● {b}</div></div>)}</div>
            <button disabled={installing} onClick={installPackage} style={{ width: "100%", padding: 13, border: 0, borderRadius: 11, background: selectedPackage.accent, color: "#fff", fontWeight: 900, cursor: installing ? "wait" : "pointer", opacity: installing ? .7 : 1 }}>{installing ? "Installing…" : installed === selectedPackage.id ? "✓ Package installed" : "Install package"}</button>
            <button onClick={copyUrl} style={{ width: "100%", padding: 12, marginTop: 9, border: "1px solid #303845", borderRadius: 11, background: "#12161c", color: "#d7dce3", fontWeight: 800, cursor: "pointer" }}>{copied ? "Copied HUD URL" : "Copy OBS Browser Source URL"}</button>
            {installMessage && <div style={{ marginTop: 12, padding: 11, borderRadius: 10, background: "#10151c", border: "1px solid #27313d", color: "#aeb7c4", fontSize: 11, lineHeight: 1.45 }}>{installMessage}</div>}
            <div style={{ marginTop: 15, padding: 12, borderRadius: 10, background: "#080a0d", border: "1px solid #1d232c", fontFamily: "monospace", fontSize: 10, color: "#77808d", wordBreak: "break-all" }}>{overlayUrl}</div>
            <div style={{ marginTop: 15, fontSize: 11, lineHeight: 1.5, color: "#687180" }}>With the local FGC OBS Bridge running, Install Package provisions or refreshes the Browser Source in OBS automatically. Without the bridge, use the URL above as a normal OBS Browser Source.</div>
          </aside>
        </section>
      </div>
    </main>
  );
}
