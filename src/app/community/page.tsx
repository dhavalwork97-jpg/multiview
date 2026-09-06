import Link from "next/link";

const PATHS = [
  { label: "LIVE", title: "Watch together", body: "Jump into active broadcasts, reactions and match context.", href: "/live", action: "Watch live" },
  { label: "MATCHES", title: "Find the action", body: "See live, upcoming and completed matches in one place.", href: "/matches", action: "Browse matches" },
  { label: "PERSONAL", title: "Your social graph", body: "Sign in when you want follows, friends and your activity history.", href: "/sign-in?redirect_url=/social", action: "Sign in for social" },
] as const;

export default function CommunityPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="relative overflow-hidden rounded-card border border-arena-700 bg-arena-900 p-6 sm:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-signal-live/10 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="page-kicker">Community hub</p>
            <h1 className="page-title mt-2 text-4xl sm:text-5xl">Community, without the sign-in wall.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted">
              Explore what is live, find the next matches and follow the competition without an account. Sign in only when you want personalized friends, follows, activity and social actions.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/live" className="action-primary">Watch live</Link>
              <Link href="/matches" className="action-secondary">Browse matches</Link>
              <Link href="/tournaments" className="action-secondary">Explore tournaments</Link>
              <Link href="/sign-in?redirect_url=/social" className="action-secondary">Sign in for social</Link>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="community-paths-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="section-label">Choose your lane</p>
              <h2 id="community-paths-heading" className="section-heading mt-1">Stay close to the competition</h2>
            </div>
            <span className="hidden font-mono text-[9px] uppercase tracking-widest text-ink-faint sm:inline">Public first · Personal when signed in</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PATHS.map((item) => (
              <Link key={item.label} href={item.href} className="surface-card surface-card-interactive group block p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live/60">
                <div className="flex items-center justify-between gap-3">
                  <p className="page-kicker">{item.label}</p>
                  <span className="font-mono text-sm text-ink-faint transition-colors group-hover:text-signal-live" aria-hidden="true">↗</span>
                </div>
                <h3 className="mt-3 font-display text-2xl uppercase tracking-wide text-ink group-hover:text-signal-live">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{item.body}</p>
                <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint group-hover:text-signal-live">{item.action}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
