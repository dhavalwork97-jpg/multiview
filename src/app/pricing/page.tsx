import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isTrialActive } from "@/lib/billing";
import { PricingPlans } from "@/components/billing/PricingPlans";

const BUSINESS_PILLARS = [
  ["01", "Run the room", "Give operators one control surface for stations, matches, streams and event state."],
  ["02", "Grow the broadcast", "Turn every tournament into a branded destination with public match, community and VOD surfaces."],
  ["03", "Prove the value", "Build toward sponsor-ready reporting, event analytics and repeatable tournament operations."],
];

const FAQ = [
  ["Can viewers use FGC Stream for free?", "Yes. Public discovery, live matches, tournaments, community discovery and watching do not require an account."],
  ["When does billing start?", "The current 14-day trial is free. Paid billing is still being prepared, so no paid plan is charged today."],
  ["Who is the paid product for?", "Starter and Pro are designed for organizers and teams running recurring competitions; Event Package is for one-off tournament deployments."],
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const dashboardHref = user ? "/dashboard" : "/sign-in?redirect_url=/dashboard";

  return (
    <main className="min-h-screen bg-arena-950 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-card border border-arena-700 bg-arena-900/70 p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-signal-live">FGC Stream for organizers</p>
              <h1 className="mt-2 max-w-4xl font-display text-4xl uppercase tracking-wide sm:text-5xl lg:text-6xl">Run the event. Own the broadcast.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-ink-muted sm:text-base">One operating layer for competitive events: tournament control, multi-station streaming, public match pages and a community that stays with the action.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="#plans" className="rounded-card bg-signal-live px-5 py-3 font-mono text-xs font-bold uppercase tracking-wide text-arena-950">See plans</Link>
                <Link href={dashboardHref} className="rounded-card border border-arena-600 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wide text-ink hover:bg-arena-800">Open Control Room</Link>
              </div>
            </div>
            <div className="rounded-card border border-signal-live/30 bg-signal-live/5 p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">Start without commitment</p>
              <p className="mt-2 font-display text-3xl uppercase">14 days free</p>
              <p className="mt-2 text-xs leading-5 text-ink-muted">No payment required. Test the organizer workflow before paid billing launches.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3">
          {BUSINESS_PILLARS.map(([number, title, body]) => (
            <article key={number} className="rounded-card border border-arena-700 bg-arena-900/40 p-5">
              <p className="font-mono text-[10px] text-signal-live">{number}</p>
              <h2 className="mt-3 font-display text-xl uppercase tracking-wide">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
            </article>
          ))}
        </section>

        <section id="plans" className="scroll-mt-24 pt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Plans & availability</p>
              <h2 className="mt-1 font-display text-3xl uppercase tracking-wide">Choose your operating model</h2>
            </div>
            <p className="max-w-md text-right text-xs leading-5 text-ink-faint">Prices shown in INR. Paid billing will remain unavailable until the platform owner enables Stripe price IDs.</p>
          </div>
          <PricingPlans trialActive={!!user && isTrialActive(user)} signedIn={!!user} />
        </section>

        <section className="mt-10 rounded-card border border-arena-700 bg-arena-900/40 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Questions</p>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {FAQ.map(([question, answer]) => (
              <div key={question}>
                <h3 className="font-medium text-ink">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
