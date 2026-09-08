import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

export async function Nav() {
  const user = await getCurrentUser();
  const canManage = user?.role === "ADMIN" || user?.role === "ORGANIZER";

  return (
    <header className="sticky top-0 z-50 border-b border-arena-700/80 bg-arena-950/90 shadow-[0_12px_48px_rgba(0,0,0,.34)] backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[4.5rem] max-w-[1680px] items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7">
        <Link
          href="/"
          aria-label="FGC Stream home"
          className="group shrink-0 rounded-[10px] px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-signal-live/60"
        >
          <span className="block font-mono text-[8px] font-bold uppercase tracking-[.24em] text-ink-faint">Competitive network</span>
          <span className="block font-display text-[25px] font-semibold uppercase leading-none tracking-[.07em] text-ink">
            FGC<span className="text-signal-live transition-opacity group-hover:opacity-80">Stream</span>
          </span>
        </Link>

        <div className="hidden h-8 w-px shrink-0 bg-arena-700 sm:block" aria-hidden="true" />

        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLinks showDashboard={Boolean(user)} showAdmin={canManage} />
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link href="/pricing" className="action-ghost min-h-10">Plans</Link>
          {user && <Link href="/dashboard" className="action-secondary min-h-10">Dashboard</Link>}
          {canManage && <Link href="/admin/tournaments/new" className="action-primary min-h-10">Create tournament</Link>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 border-l border-arena-700 pl-2 sm:gap-2 sm:pl-3">
          {user?.role === "ADMIN" && (
            <Link href="/admin/users" className="hidden min-h-10 items-center rounded-[10px] border border-arena-600 px-3 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-ink-muted transition-all hover:border-signal-live/50 hover:bg-arena-800 hover:text-ink lg:inline-flex">
              Users
            </Link>
          )}
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="action-secondary min-h-10">Sign in</button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
