"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState("Reviewing invitation…");
  async function accept() {
    setState("Accepting…");
    const res = await fetch("/api/organizations/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setState(data.error ?? "Unable to accept invitation"); return; }
    setState("Invitation accepted");
    setTimeout(() => router.push("/dashboard"), 500);
  }
  return <main className="min-h-screen bg-arena-950 px-6 py-16"><div className="mx-auto max-w-lg rounded-card border border-arena-700 bg-arena-900 p-7"><p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Organizer invitation</p><h1 className="mt-2 font-display text-3xl uppercase">Join the event team</h1><p className="mt-3 text-sm text-ink-muted">Sign in with the invited email address, then accept this invitation to access organizer operations.</p><p className="mt-5 rounded-card border border-arena-700 p-3 text-sm text-ink-faint">{state}</p><div className="mt-5 flex gap-3"><button onClick={() => void accept()} className="rounded-card bg-signal-live px-4 py-2 font-mono text-xs uppercase text-arena-950">Accept invitation</button><Link href="/sign-in" className="rounded-card border border-arena-600 px-4 py-2 font-mono text-xs uppercase">Sign in</Link></div></div></main>;
}
