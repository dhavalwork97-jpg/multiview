import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

export async function Nav() {
  const user = await getCurrentUser();
  const canManage = user?.role === "ADMIN" || user?.role === "ORGANIZER";

  return (
    <header className="sticky top-0 z-50 border-b border-arena-700/80 bg-arena-950/95 shadow-[0_10px_40px_rgba(0,0,0,.28)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.5rem] max-w-[1680px] items-center gap-2 px-3 sm:gap-4 sm:px-5 lg:px-6">
        <Link
          href="/"
          aria-label="FGC Stream home"
          className="group shrink-0 rounded-card px-1 py-2 font-display text-xl font-semibold uppercase tracking-[0.08em] text-ink outline-none transition-colors hover:text-signal-live focus-visible:ring-2 focus-visible:ring-signal-live/60"
        >
          FGC<span className="text-signal-live transition-opacity group-hover:opacity-80">Stream</span>
        </Link>

        <div className="h-7 w-px shrink-0 bg-arena-700" aria-hidden="true" />

        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLinks showDashboard={Boolean(user)} showAdmin={canManage} />
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Link href="/pricing" className="action-secondary min-h-10">
            Plans
          </Link>
          {user && (
            <Link href="/dashboard" className="action-secondary min-h-10 border-arena-600">
              Dashboard
            </Link>
          )}
          {canManage && (
            <Link href="/admin/tournaments/new" className="action-primary min-h-10">
              Create tournament
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-l border-arena-700 pl-2 sm:pl-3">
          {user?.role === "ADMIN" && (
            <Link href="/admin/users" className="hidden min-h-10 items-center rounded-card border border-arena-600 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-signal-live hover:text-ink lg:inline-flex">
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
