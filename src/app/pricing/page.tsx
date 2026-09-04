import { getCurrentUser } from "@/lib/auth";
import { isTrialActive } from "@/lib/billing";
import { PricingPlans } from "@/components/billing/PricingPlans";

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <main className="min-h-screen bg-arena-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-signal-live">FGC Stream plans</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide">Run more stations. Broadcast better.</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">Choose the plan that matches your event size. Paid billing can be enabled by the platform owner when Stripe price IDs are configured.</p>
        <div className="mt-10"><PricingPlans trialActive={!!user && isTrialActive(user)} /></div>
        {!user && <p className="mt-5 text-center text-xs text-ink-faint">Sign in to start the free trial.</p>}
      </div>
    </main>
  );
}
