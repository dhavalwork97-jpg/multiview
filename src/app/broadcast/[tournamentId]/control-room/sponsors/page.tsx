"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveSponsor, normalizeSponsor, type BroadcastSponsor } from "@/lib/broadcast/sponsor";

const storageKey = (id: string) => `fgc-broadcast-sponsors:${id}`;
const defaultSponsors: BroadcastSponsor[] = [];

export default function SponsorManager({ params }: { params: Promise<{ tournamentId: string }> }) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [sponsors, setSponsors] = useState<BroadcastSponsor[]>(defaultSponsors);
  const [intervalMs, setIntervalMs] = useState(6000);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [durationMs, setDurationMs] = useState(6000);
  const [previewElapsed, setPreviewElapsed] = useState(0);

  useEffect(() => {
    void params.then(({ tournamentId: id }) => {
      setTournamentId(id);
      try {
        const raw = window.localStorage.getItem(storageKey(id));
        if (!raw) return;
        const value = JSON.parse(raw) as { sponsors?: Partial<BroadcastSponsor>[]; intervalMs?: number };
        setSponsors((value.sponsors ?? []).map((item, index) => normalizeSponsor(item, index)));
        setIntervalMs(Math.max(1000, Number(value.intervalMs ?? 6000)));
      } catch {
        // Keep safe defaults.
      }
    });
  }, [params]);

  useEffect(() => {
    if (!tournamentId) return;
    window.localStorage.setItem(storageKey(tournamentId), JSON.stringify({ sponsors, intervalMs }));
  }, [tournamentId, sponsors, intervalMs]);

  useEffect(() => {
    const timer = window.setInterval(() => setPreviewElapsed((value) => value + 250), 250);
    return () => window.clearInterval(timer);
  }, []);

  const activeSponsor = useMemo(() => getActiveSponsor({ sponsors, intervalMs }, previewElapsed), [sponsors, intervalMs, previewElapsed]);

  function addSponsor() {
    const next = normalizeSponsor({ name, logoUrl, websiteUrl, durationMs }, sponsors.length);
    setSponsors((items) => [...items, next]);
    setName("");
    setLogoUrl("");
    setWebsiteUrl("");
    setDurationMs(6000);
  }

  function updateSponsor(id: string, patch: Partial<BroadcastSponsor>) {
    setSponsors((items) => items.map((item) => item.id === id ? normalizeSponsor({ ...item, ...patch }) : item));
  }

  function removeSponsor(id: string) {
    setSponsors((items) => items.filter((item) => item.id !== id));
  }

  function reset() {
    setSponsors([]);
    setIntervalMs(6000);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080d", color: "#f7f8ff", padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, marginBottom: 24 }}>
          <div><div style={eyebrow}>FGC BROADCAST STUDIO</div><h1 style={title}>Sponsor Manager</h1><p style={muted}>Manage rotating sponsor bumpers and browser-source sponsor graphics for this tournament.</p></div>
          <a href={`/broadcast/${tournamentId}/control-room`} style={link}>← CONTROL ROOM</a>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1.3fr .7fr", gap: 18, alignItems: "start" }}>
          <div style={panel}>
            <div style={rowHeader}><div><div style={eyebrow}>ROTATION</div><h2 style={sectionTitle}>Sponsor lineup</h2></div><label style={smallLabel}>INTERVAL <input aria-label="Sponsor rotation interval" type="number" min={1000} step={500} value={intervalMs} onChange={(event) => setIntervalMs(Math.max(1000, Number(event.target.value) || 1000))} style={input} /> ms</label></div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {sponsors.map((sponsor) => <div key={sponsor.id} style={item}>
                <div style={{ minWidth: 0, flex: 1 }}><strong>{sponsor.name}</strong><div style={muted}>{sponsor.logoUrl || "No logo URL"}</div></div>
                <label style={toggle}><input type="checkbox" checked={sponsor.enabled} onChange={(event) => updateSponsor(sponsor.id, { enabled: event.target.checked })} /> ACTIVE</label>
                <input aria-label={`${sponsor.name} duration`} type="number" min={1000} step={500} value={sponsor.durationMs} onChange={(event) => updateSponsor(sponsor.id, { durationMs: Number(event.target.value) || 1000 })} style={{ ...input, width: 96 }} />
                <button onClick={() => removeSponsor(sponsor.id)} style={danger}>REMOVE</button>
              </div>)}
              {!sponsors.length && <div style={empty}>No sponsors configured. Add the first sponsor below.</div>}
            </div>
          </div>

          <div style={panel}>
            <div style={eyebrow}>LIVE PREVIEW</div><h2 style={sectionTitle}>Sponsor bumper</h2>
            <div style={preview}><div style={previewLabel}>PRESENTED BY</div>{activeSponsor ? <><div style={sponsorName}>{activeSponsor.name}</div>{activeSponsor.logoUrl && <img src={activeSponsor.logoUrl} alt="" style={logo} />}</> : <div style={muted}>No active sponsor</div>}</div>
            <button onClick={() => setPreviewElapsed(0)} style={button}>RESET PREVIEW</button>
          </div>
        </section>

        <section style={{ ...panel, marginTop: 18 }}>
          <div style={eyebrow}>ADD SPONSOR</div><h2 style={sectionTitle}>New sponsor</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.5fr 1.5fr .8fr auto", gap: 10, marginTop: 14, alignItems: "end" }}>
            <Field label="NAME" value={name} onChange={setName} placeholder="Sponsor name" />
            <Field label="LOGO URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://…" />
            <Field label="WEBSITE URL" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://…" />
            <Field label="DURATION MS" value={String(durationMs)} onChange={(value) => setDurationMs(Number(value) || 1000)} type="number" />
            <button onClick={addSponsor} disabled={!name.trim()} style={{ ...button, opacity: name.trim() ? 1 : .4 }}>ADD</button>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button onClick={reset} style={danger}>RESET SPONSORS</button></div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label style={smallLabel}>{label}<input value={value} type={type} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={{ ...input, width: "100%", marginTop: 7 }} /></label>; }
const panel = { background: "#0c0e14", border: "1px solid #252936", borderRadius: 20, padding: 20 } as const;
const item = { display: "flex", alignItems: "center", gap: 12, padding: 13, borderRadius: 12, background: "#10131b", border: "1px solid #252936" } as const;
const eyebrow = { fontSize: 10, letterSpacing: ".18em", opacity: .45 } as const;
const title = { fontSize: 34, margin: "7px 0 0" } as const;
const sectionTitle = { fontSize: 18, margin: "6px 0 0" } as const;
const muted = { fontSize: 11, opacity: .5, marginTop: 5 } as const;
const rowHeader = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 18 } as const;
const smallLabel = { fontSize: 10, letterSpacing: ".12em", opacity: .65, display: "block" } as const;
const input = { border: "1px solid #2b2f3c", borderRadius: 9, background: "#080a10", color: "white", padding: "9px 10px", boxSizing: "border-box" as const };
const button = { border: "1px solid #3b2a67", borderRadius: 9, background: "#7c3aed", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" } as const;
const danger = { border: "1px solid #4a2931", borderRadius: 9, background: "#171015", color: "#fda4af", padding: "9px 12px", fontWeight: 700, cursor: "pointer" } as const;
const link = { color: "#c4b5fd", textDecoration: "none", fontSize: 11, letterSpacing: ".12em" } as const;
const toggle = { fontSize: 9, letterSpacing: ".1em", opacity: .7, whiteSpace: "nowrap" as const };
const empty = { border: "1px dashed #303441", borderRadius: 12, padding: 22, textAlign: "center" as const, opacity: .55, fontSize: 12 };
const preview = { minHeight: 180, borderRadius: 14, margin: "14px 0", padding: 20, background: "linear-gradient(135deg,#171224,#08090e)", border: "1px solid #31244d", display: "flex", flexDirection: "column" as const, justifyContent: "center", alignItems: "center", textAlign: "center" as const };
const previewLabel = { fontSize: 9, letterSpacing: ".25em", opacity: .5 } as const;
const sponsorName = { fontSize: 28, fontWeight: 800, margin: "10px 0" } as const;
const logo = { maxWidth: 180, maxHeight: 60, objectFit: "contain" as const };
