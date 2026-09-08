import Link from "next/link";

const lanes = [
  {
    code: "LIVE",
    title: "Watch together",
    body: "Jump into active broadcasts, reactions and match context.",
    href: "/live",
  },
  {
    code: "MATCHES",
    title: "Find the action",
    body: "See live, upcoming and completed matches in one place.",
    href: "/matches",
  },
  {
    code: "PERSONAL",
    title: "Your social graph",
    body: "Sign in when you want follows, friends and your activity history.",
    href: "/social",
  },
];

export default function CommunityPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="ds-grid relative overflow-hidden border-b border-arena-700 py-10 sm:py-14 lg:py-16">
          <div className="ds-glow right-[-6rem] top-[-5rem] h-72 w-72" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-end">
            <div className="max-w-4xl">
              <p className="page-kicker">FGC / community network</p>
              <h1 className="display-heading mt-4 text-5xl sm:text-7xl">The arena is<br className="sm:hidden" /> more than a stream.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-muted">Explore live competition without a sign-in wall. Sign in only when you want personalized friends, follows, activity, chat and social actions.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/live" className="action-primary min-h-11 px-5">Watch live</Link>
                <Link href="/matches" className="action-secondary min-h-11 px-5">Browse matches</Link>
                <Link href="/sign-in?redirect_url=/social" className="action-ghost min-h-11 px-5">Sign in for social →</Link>
              </div>
            </div>
            <aside className="surface-console relative overflow-hidden p-5" aria-label="Community access">
              <div className="absolute inset-x-0 top-0 h-px bg-signal-live/70" aria-hidden="true" />
              <p className="ds-index">ACCESS / PUBLIC</p>
              <p className="mt-3 font-display text-3xl uppercase tracking-wide text-ink">Open arena</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Live viewing stays open. Personal social tools activate after sign-in.</p>
              <div className="mt-5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-signal-live"><span className="h-1.5 w-1.5 rounded-full bg-signal-live animate-live-pulse" /> Broadcast layer ready</div>
            </aside>
          </div>
        </section>

        <section className="ds-section">
          <div className="ds-section-header">
            <div><p className="ds-index">01 / community lanes</p><h2 className="section-heading mt-1">Choose your signal</h2></div>
            <span className="section-meta">3 entry points</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {lanes.map((lane, index) => (
              <Link key={lane.href} href={lane.href} className="surface-card surface-card-interactive group relative overflow-hidden p-6 sm:p-7">
                <span className="absolute right-5 top-5 ds-index">0{index + 1}</span>
                <p className="section-label">{lane.code}</p>
                <h3 className="mt-3 font-display text-3xl uppercase tracking-wide group-hover:text-signal-live">{lane.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{lane.body}</p>
                <span className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-signal-live">Enter →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ds-section pt-0">
          <div className="surface-console overflow-hidden p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="page-kicker text-signal-live">02 / realtime layer</p>
                <h2 className="mt-2 font-display text-4xl uppercase tracking-wide">Chat. React. Follow the set.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">Presence, conversations, reactions and watch parties already live in the product's realtime systems. This surface routes viewers into those experiences rather than duplicating their backend.</p>
              </div>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-arena-700 bg-arena-700">
                <Link href="/social" className="min-w-28 bg-arena-900 px-5 py-4 text-center transition hover:bg-arena-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live">
                  <span className="block font-display text-2xl uppercase">Social</span><span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-widest text-ink-faint">Personal</span>
                </Link>
                <Link href="/multiview" className="min-w-28 bg-arena-900 px-5 py-4 text-center transition hover:bg-arena-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live">
                  <span className="block font-display text-2xl uppercase">Multi-view</span><span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-widest text-ink-faint">Broadcast</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
