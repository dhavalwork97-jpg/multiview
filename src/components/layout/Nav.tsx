import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

const MOBILE_LINKS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/tournaments", label: "Tournaments", icon: "◈" },
  { href: "/live", label: "Streams", icon: "▶" },
  { href: "/community", label: "Community", icon: "◌" },
  { href: "/players", label: "Players", icon: "◎" },
];

export async function Nav() {
  const user = await getCurrentUser();
  const canManage = user?.role === "ADMIN" || user?.role === "ORGANIZER";

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
            <NavLinks showDashboard={Boolean(user)} showAdmin={canManage} />
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            <Link href="/pricing" className="action-ghost">Plans</Link>
            {user && <Link href="/dashboard" className="action-secondary">Dashboard</Link>}
            {canManage && <Link href="/admin/tournaments/new" className="action-primary">Create tournament</Link>}
          </div>
          <div className="flex shrink-0 items-center gap-2 border-l border-white/10 pl-2 sm:pl-3">
            {user?.role === "ADMIN" && <Link href="/admin/users" className="hidden min-h-10 items-center rounded-[12px] border border-white/10 px-3 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-white/60 transition hover:border-[#6f3cff]/60 hover:bg-white/5 hover:text-white lg:inline-flex">Users</Link>}
            <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
            <SignedOut><SignInButton mode="modal"><button type="button" className="action-secondary">Sign in</button></SignInButton></SignedOut>
          </div>
        </div>
      </header>
      {!canManage && (
        <nav aria-label="Mobile navigation" className="fgc-mobile-nav md:hidden">
          {MOBILE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="fgc-mobile-nav__item">
              <span className="fgc-mobile-nav__icon" aria-hidden="true">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
