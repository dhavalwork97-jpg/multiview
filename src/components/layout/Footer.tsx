import Link from "next/link";

const legalLinks = [
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/community-guidelines", "Community Guidelines"],
  ["/copyright", "Copyright"],
  ["/refunds", "Refunds"],
  ["/pricing", "Plans"],
] as const;

export function Footer() {
  return (
    <footer className="border-t border-arena-700/80 bg-arena-950/95">
      <div className="mx-auto max-w-[1680px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[.22em] text-ink-faint">The competitive network</p>
            <p className="mt-1 font-display text-3xl uppercase leading-none tracking-[.06em] text-ink">FGC<span className="text-signal-live">Stream</span></p>
            <p className="mt-3 max-w-md text-xs leading-5 text-ink-faint">Competition, broadcast and community infrastructure built for the fight-game ecosystem.</p>
          </div>
          <nav aria-label="Legal and trust navigation" className="flex flex-wrap gap-2 lg:justify-end">
            {legalLinks.map(([href, label]) => (
              <Link key={href} className="rounded-[8px] px-2.5 py-2 text-xs text-ink-muted transition-colors hover:bg-arena-800 hover:text-ink focus-visible:ring-2 focus-visible:ring-signal-live/40" href={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 border-t border-arena-800 pt-4 font-mono text-[9px] uppercase tracking-[.14em] text-ink-faint">
          FGC Stream · competition, live broadcast, community
        </div>
      </div>
    </footer>
  );
}
