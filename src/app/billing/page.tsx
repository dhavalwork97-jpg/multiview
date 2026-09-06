import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, isPremium, trialDaysRemaining } from "@/lib/billing";
import { BillingActions } from "./BillingActions";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/billing");

  const premium = isPremium(user);
  const days = trialDaysRemaining(user);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header>
        <p className="text-sm font-medium text-white/50">FGC Commercial</p>
        <h1 className="mt-2 text-3xl font-semibold">Plans & billing</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">Manage the plan that powers your organizer and tournament operations workspace.</p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm font-medium">Current access</p>
        <p className="mt-2 text-lg">{user.subscriptionStatus === "ACTIVE" ? "Paid subscription active" : premium ? `Free trial active${days ? ` · ${days} days remaining` : ""}` : "Free plan"}</p>
        {user.subscriptionStatus === "PAST_DUE" ? <p className="mt-1 text-sm text-amber-300">Payment needs attention. Use Manage billing to update payment details.</p> : null}
        {user.subscriptionStatus === "CANCELED" ? <p className="mt-1 text-sm text-white/60">Your subscription is canceled. You can start a new plan below.</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PLANS.filter((plan) => plan.name !== "Free Trial").map((plan) => (
          <article key={plan.name} className="rounded-xl border border-white/10 bg-black/20 p-5">
            <h2 className="font-semibold">{plan.name}</h2>
            <p className="mt-2 text-2xl font-semibold">{plan.price}</p>
            <p className="text-sm text-white/50">{plan.cadence}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {plan.features.slice(0, 5).map((feature) => <li key={feature}>• {feature}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <BillingActions />
      <p className="text-xs text-white/40">Paid billing requires production Stripe configuration. No payment details are handled directly by FGC.</p>
    </main>
  );
}
