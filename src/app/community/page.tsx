import Link from "next/link";

export default function CommunityPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="surface-card p-6 sm:p-8">
          <p className="page-kicker">FGC broadcast network</p>
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
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Link href="/live" className="surface-card p-5 transition hover:border-signal-live/50">
            <p className="page-kicker">LIVE</p>
            <h2 className="mt-2 font-display text-2xl uppercase">Watch together</h2>
            <p className="mt-2 text-sm text-ink-muted">Jump into active broadcasts, reactions and match context.</p>
          </Link>
          <Link href="/matches" className="surface-card p-5 transition hover:border-signal-live/50">
            <p className="page-kicker">MATCHES</p>
            <h2 className="mt-2 font-display text-2xl uppercase">Find the action</h2>
            <p className="mt-2 text-sm text-ink-muted">See live, upcoming and completed matches in one place.</p>
          </Link>
          <Link href="/social" className="surface-card p-5 transition hover:border-signal-live/50">
            <p className="page-kicker">PERSONAL</p>
            <h2 className="mt-2 font-display text-2xl uppercase">Your social graph</h2>
            <p className="mt-2 text-sm text-ink-muted">Sign in when you want follows, friends and your activity history.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
