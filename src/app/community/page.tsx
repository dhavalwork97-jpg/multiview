import Link from "next/link";

export default function CommunityPage() {
  return (
    <main className="page-shell"><div className="page-container">
      <section className="ds-grid relative overflow-hidden border-b border-arena-700 py-10 sm:py-14 lg:py-16">
        <div className="ds-glow right-[-6rem] top-[-5rem] h-72 w-72" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <p className="page-kicker">FGC / community network</p>
          <h1 className="display-heading mt-4 text-5xl sm:text-7xl">The arena is<br className="sm:hidden" /> more than a stream.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ink-muted">Explore live competition without a sign-in wall. Sign in only when you want personalized friends, follows, activity, chat and social actions.</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/live" className="action-primary min-h-11 px-5">Watch live</Link>
            <Link href="/matches" className="action-secondary min-h-11 px-5">Browse matches</Link>
            <Link href="/sign-in?redirect_url=/social" className="action-ghost min-h-11 px-5">Sign in for social →</Link>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-section-header"><div><p className="ds-index">01 / community lanes</p><h2 className="section-heading mt-1">Choose your signal</h2></div></div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["LIVE", "Watch together", "Jump into active broadcasts, reactions and match context.", "/live"],
            ["MATCHES", "Find the action", "See live, upcoming and completed matches in one place.", "/matches"],
            ["PERSONAL", "Your social graph", "Sign in when you want follows, friends and your activity history.", "/social"],
          ].map(([kicker, title, body, href], index) => (
            <Link key={href} href={href} className="surface-card surface-card-interactive group relative overflow-hidden p-6 sm:p-7">
              <span className="absolute right-5 top-5 ds-index">0{index + 1}</span>
              <p className="section-label">{kicker}</p><h3 className="mt-3 font-display text-3xl uppercase tracking-wide group-hover:text-signal-live">{title}</h3><p className="mt-3 text-sm leading-6 text-ink-muted">{body}</p><span className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-signal-live">Enter →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="ds-section pt-0">
        <div className="surface-console p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="page-kicker text-signal-live">Realtime layer</p><h2 className="mt-2 font-display text-4xl uppercase tracking-wide">Chat. React. Follow the set.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">The existing realtime systems remain the source of truth for presence, conversations, reactions and watch parties. This surface is the entry point—not a duplicate social backend.</p></div><Link href="/multiview" className="action-primary min-h-11">Open the arena →</Link></div>
        </div>
      </section>
    </div></main>
  );
}
