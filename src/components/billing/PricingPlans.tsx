"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS } from "@/lib/billing";

export function PricingPlans({ trialActive = false, signedIn = false }: { trialActive?: boolean; signedIn?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function startTrial() {
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/billing/trial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start trial");
      setMessage("Your 14-day free trial is active. Refreshing…");
      window.location.reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to start trial"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-8 rounded-card border border-signal-live/40 bg-signal-live/5 p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">No payment required</p>
        <h2 className="mt-1 font-display text-2xl uppercase tracking-wide">Run your first event free</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">Get the real tournament workflow for 14 days — setup, brackets, stations, Control Room, broadcast connections, YouTube Live and Multiview. No credit card required.</p>
        {!signedIn ? (
          <Link href="/sign-in?redirect_url=/pricing" className="mt-4 inline-flex rounded-card bg-signal-live px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-arena-950">Sign in to start free trial</Link>
        ) : (
          <button disabled={loading || trialActive} onClick={startTrial} className="mt-4 rounded-card bg-signal-live px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-arena-950 disabled:cursor-not-allowed disabled:opacity-50">
            {trialActive ? "Free trial active" : loading ? "Starting…" : "Start free trial"}
          </button>
        )}
        {message && <p className="mt-2 text-xs text-ink-faint">{message}</p>}
      </div>

      <div className="mb-5 max-w-3xl">
        <h2 className="font-display text-2xl uppercase tracking-wide">Choose how you run tournaments</h2>
        <p className="mt-2 text-sm text-ink-muted">Pay for the event capacity you actually need. YouTube and RTMP connections are part of the broadcast workflow, not separate add-ons.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <article key={plan.name} className={`flex flex-col rounded-card border p-5 ${plan.name === "Organizer" ? "border-signal-live/60 bg-signal-live/5" : "border-arena-600 bg-arena-800"}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl uppercase tracking-wide">{plan.name}</h3>
              <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${plan.status === "Available" ? "border-signal-live/50 text-signal-live" : plan.status === "Contact Us" ? "border-arena-500 text-ink-muted" : "border-arena-600 text-ink-faint"}`}>{plan.status}</span>
            </div>
            <p className="mt-2 min-h-10 text-xs text-ink-muted">{plan.description}</p>
            <div className="mt-4"><span className="font-display text-2xl">{plan.price}</span><span className="ml-1 text-xs text-ink-faint">{plan.cadence}</span></div>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-muted">{plan.features.map((f) => <li key={f} className="flex gap-2"><span className="text-signal-live">✓</span>{f}</li>)}</ul>
            {plan.status === "Contact Us" ? <div className="mt-5 rounded border border-arena-700 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-ink-faint">Talk to the team</div> : plan.status !== "Available" && <div className="mt-5 rounded border border-arena-700 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-ink-faint">Paid billing coming soon</div>}
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-arena-700 bg-arena-900 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Simple pricing rule</p>
        <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-ink-muted md:grid-cols-3">
          <div><strong className="text-ink">No viewer fees.</strong><br />Your video delivery remains with YouTube/Kick/your RTMP provider.</div>
          <div><strong className="text-ink">No broadcast add-ons.</strong><br />Connect YouTube or save RTMP destinations as part of the plan.</div>
          <div><strong className="text-ink">Station-based capacity.</strong><br />Your plan scales with the physical tournament operation.</div>
        </div>
      </div>
    </div>
  );
}
