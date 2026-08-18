"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { buildEventSetupChecklist } from "@/lib/event-setup";
import { canManageEvent, type OrganizerRole } from "@/lib/organization-rbac";
import { TournamentAdminNav } from "@/components/admin/TournamentAdminNav";

type Incident = { id: string; severity: "INFO" | "WARNING" | "CRITICAL"; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"; title: string; details?: string | null; createdAt: string };
type Metrics = { totals: { views: number; watchSeconds: number } };

export default function TournamentOperationsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<Incident["severity"]>("WARNING");
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<OrganizerRole>("VIEWER");
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
  const canOperate = canManageEvent(role);
  const steps = buildEventSetupChecklist();

  async function refresh() {
    const [i, m, access] = await Promise.all([fetch(`/api/tournaments/${tournamentId}/incidents`, { cache: "no-store" }), fetch(`/api/tournaments/${tournamentId}/metrics`, { cache: "no-store" }), fetch(`/api/tournaments/${tournamentId}/control-room`, { cache: "no-store" })]);
    if (i.ok) setIncidents((await i.json()).incidents ?? []);
    if (m.ok) setMetrics(await m.json());
    if (access.ok) { const data = await access.json(); setRole(data.role ?? "VIEWER"); }
  }
  useEffect(() => { void refresh(); }, [tournamentId]);

  async function reconcile() {
    const res = await fetch(`/api/tournaments/${tournamentId}/reconcile`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setReconcileMessage(res.ok ? `Recovery pass complete: ${data.repaired?.length ?? 0} repaired, ${data.autoAssigned?.length ?? 0} assigned.` : (data.error ?? "Recovery failed"));
    await refresh();
  }

  async function createIncident() {
    if (!title.trim()) return;
    const res = await fetch(`/api/tournaments/${tournamentId}/incidents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, severity }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "Unable to create incident"); return; }
    setTitle(""); await refresh();
  }

  async function updateIncident(id: string, status: Incident["status"]) {
    const res = await fetch(`/api/tournaments/${tournamentId}/incidents/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) setError("Unable to update incident");
    await refresh();
  }

  return <main className="mx-auto max-w-6xl space-y-8 px-6 py-10"><TournamentAdminNav tournamentId={tournamentId} />
    <header><p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Organizer operations</p><h1 className="mt-2 text-3xl font-semibold text-ink">Event control</h1><p className="mt-2 max-w-2xl text-sm text-ink-faint">A commercial-ready operations layer for staffing, incidents, setup and spectator analytics.</p></header>
    {error && <button onClick={() => setError(null)} className="w-full rounded-xl border border-signal-error/50 bg-signal-error/10 p-3 text-left text-sm text-signal-error">{error} · dismiss</button>}

    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-line p-5"><p className="text-xs uppercase tracking-wide text-ink-faint">Role</p><p className="mt-2 text-xl font-semibold text-ink">{role}</p><p className="mt-2 text-sm text-ink-faint">Event control: {canManageEvent(role) ? "enabled" : "read only"}</p></div>
      <div className="rounded-xl border border-line p-5"><p className="text-xs uppercase tracking-wide text-ink-faint">Spectator views</p><p className="mt-2 text-2xl font-semibold text-ink">{metrics?.totals.views ?? 0}</p></div>
      <div className="rounded-xl border border-line p-5"><p className="text-xs uppercase tracking-wide text-ink-faint">Watch time</p><p className="mt-2 text-2xl font-semibold text-ink">{Math.floor((metrics?.totals.watchSeconds ?? 0) / 60)} min</p></div>
    </section>

    <section className="rounded-xl border border-line p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Event setup</h2><p className="mt-1 text-sm text-ink-faint">Run the database-safe recovery pass when stations or queued matches become stale.</p></div><button disabled={!canOperate} onClick={() => void reconcile()} className="rounded-lg border border-signal-live px-4 py-2 text-sm font-semibold text-signal-live disabled:opacity-40">Run recovery / reconcile</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{steps.map(step => <div key={step.id} className="rounded-lg border border-line p-4"><p className="font-medium text-ink">{step.title}</p><p className="mt-1 text-sm text-ink-faint">{step.description}</p></div>)}</div></section>
    {reconcileMessage && <p className="rounded-lg border border-line p-3 text-sm text-ink-muted">{reconcileMessage}</p>}

    <section className="rounded-xl border border-line p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-ink">Incident desk</h2><p className="mt-1 text-sm text-ink-faint">Keep operator issues visible and auditable.</p></div><div className="flex gap-2"><select disabled={!canOperate} value={severity} onChange={e => setSeverity(e.target.value as Incident["severity"])} className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"><option>WARNING</option><option>INFO</option><option>CRITICAL</option></select><input disabled={!canOperate} value={title} onChange={e => setTitle(e.target.value)} placeholder="Describe an issue" className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"/><button disabled={!canOperate} onClick={() => void createIncident()} className="rounded-lg bg-signal-live px-4 py-2 text-sm font-semibold text-arena-950">Log</button></div></div><div className="mt-5 space-y-2">{incidents.length === 0 ? <p className="text-sm text-ink-faint">No incidents logged.</p> : incidents.map(i => <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3"><div><p className="font-medium text-ink">{i.title}</p><p className="text-xs text-ink-faint">{i.severity} · {i.status} · {new Date(i.createdAt).toLocaleString()}</p></div>{i.status !== "RESOLVED" && <div className="flex gap-2"><button disabled={!canOperate} onClick={() => void updateIncident(i.id, "ACKNOWLEDGED")} className="rounded border border-line px-2 py-1 text-xs">Acknowledge</button><button disabled={!canOperate} onClick={() => void updateIncident(i.id, "RESOLVED")} className="rounded border border-line px-2 py-1 text-xs">Resolve</button></div>}</div>)}</div></section>
  </main>;
}
