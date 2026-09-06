"use client";

import { useState } from "react";

export function BillingActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: "STARTER" | "PRO" | "EVENT") {
    setBusy(plan); setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? "Unable to start checkout");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout");
      setBusy(null);
    }
  }

  async function portal() {
    setBusy("portal"); setError(null);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? "Unable to open billing portal");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing portal");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {(["STARTER", "PRO", "EVENT"] as const).map((plan) => (
          <button key={plan} type="button" disabled={busy !== null} onClick={() => checkout(plan)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium transition hover:bg-white/10 disabled:opacity-50">
            {busy === plan ? "Opening checkout…" : `Buy ${plan === "EVENT" ? "Event Package" : plan}`}
          </button>
        ))}
      </div>
      <button type="button" disabled={busy !== null} onClick={portal} className="rounded-lg border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/5 disabled:opacity-50">
        {busy === "portal" ? "Opening portal…" : "Manage billing"}
      </button>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
