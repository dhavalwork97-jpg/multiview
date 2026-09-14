import Link from "next/link";
import { NavLinks } from "./NavLinks";

const MOBILE_LINKS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/tournaments", label: "Tournaments", icon: "◈" },
  { href: "/live", label: "Streams", icon: "▶" },
  { href: "/community", label: "Community", icon: "◌" },
  { href: "/players", label: "Players", icon: "◎" },
];

/**
 * Public navigation is intentionally auth-free.
 *
 * Authenticated workspaces render their own authenticated controls. Keeping
 * Clerk out of this shared public shell prevents the Clerk browser runtime
 * from becoming a dependency of every public page.
 */
export function Nav() {
  return (
    <>
      <header className="sticky top-0 z-50 h-[var(--ui-header-height)] border-b border-white/[.08] bg-[#050817]/90 shadow-[0_18px_70px_rgba(0,0,0,.5)] backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="FGC Stream home" className="group flex shrink-0 items-center gap-3 rounded-xl px-1 py-2 outline-none">
            <span className="fgc-logo-mark" aria-hidden="true">FGC</span>
            <span className="hidden h-7 w-px bg-white/15 sm:block" aria-hidden="true" />
            <span className="hidden font-mono text-[9px] font-semibold uppercase tracking-[.18em] text-white/45 sm:block">Design System 2.0</span>
          </Link>
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLinks />
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            <Link href="/pricing" className="action-ghost">Plans</Link>
            <Link href="/sign-in" className="action-secondary">Sign in</Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 border-l border-white/10 pl-2 sm:pl-3 md:hidden">
            <Link href="/sign-in" className="action-secondary">Sign in</Link>
          </div>
        </div>
      </header>
      <nav aria-label="Mobile navigation" className="fgc-mobile-nav md:hidden">
        {MOBILE_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="fgc-mobile-nav__item">
            <span className="fgc-mobile-nav__icon" aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
