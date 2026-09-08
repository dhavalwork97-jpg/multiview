import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-arena-800 bg-arena-950">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-lg uppercase tracking-[0.08em]">FGC<span className="text-signal-live">Stream</span></p>
          <p className="mt-1 text-xs text-ink-faint">Competition, broadcast and community infrastructure.</p>
        </div>
        <nav aria-label="Legal and trust navigation" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
          <Link className="hover:text-ink" href="/terms">Terms</Link>
          <Link className="hover:text-ink" href="/privacy">Privacy</Link>
          <Link className="hover:text-ink" href="/community-guidelines">Community Guidelines</Link>
          <Link className="hover:text-ink" href="/copyright">Copyright</Link>
          <Link className="hover:text-ink" href="/refunds">Refunds</Link>
          <Link className="hover:text-ink" href="/pricing">Plans</Link>
        </nav>
      </div>
    </footer>
  );
}
