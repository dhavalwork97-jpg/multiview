import { getCurrentUser } from "@/lib/auth";
import { isTrialActive } from "@/lib/billing";
import { PricingPlans } from "@/components/billing/PricingPlans";

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <main className="min-h-screen bg-arena-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-signal-live">FGC Stream pricing</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide">One workspace for the whole tournament.</h1>
        <p className="mt-3 max-w-3xl text-ink-muted">Run registration, brackets, schedules, stations, Control Room and broadcast operations from one place. Choose monthly capacity for recurring events or pay per event.</p>
        <div className="mt-10"><PricingPlans trialActive={!!user && isTrialActive(user)} signedIn={!!user} /></div>
      </div>
    </main>
  );
}
