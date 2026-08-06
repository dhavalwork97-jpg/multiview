"use client";

import { useState } from "react";

export function BillingButton({ isPremium }: { isPremium: boolean }) {
  const [loading, setLoading] = useState(false);

  async function go(endpoint: "checkout" | "portal") {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  if (isPremium) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => go("portal")}
        className="rounded border border-arena-600 px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-ink-muted hover:text-ink"
      >
        Manage subscription
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => go("checkout")}
      className="rounded bg-signal-warn px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-arena-950 hover:opacity-90"
    >
      Upgrade to Premium
    </button>
  );
}
