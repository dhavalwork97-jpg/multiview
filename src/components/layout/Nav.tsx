import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

export async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-arena-700 bg-arena-950/98 shadow-[0_8px_30px_rgba(0,0,0,.22)] backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-3 px-3 sm:px-5">
        <Link href="/" className="shrink-0 rounded-card px-1 font-display text-lg uppercase tracking-wide text-ink hover:text-signal-live">
          FGC<span className="text-signal-live">Stream</span>
        </Link>

        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLinks />
        </div>

        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <Link href="/pricing" className="inline-flex min-h-9 items-center rounded-card border border-transparent px-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-muted hover:border-arena-600 hover:bg-arena-800 hover:text-ink">
            Plans
          </Link>
          {user && (
            <Link href="/dashboard" className="inline-flex min-h-9 items-center rounded-card border border-arena-600 px-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink hover:border-signal-live hover:text-signal-live">
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && (
            <Link href="/admin/tournaments/new" className="hidden min-h-9 items-center rounded-card bg-signal-live px-3 font-mono text-[11px] font-bold uppercase tracking-wide text-arena-950 hover:opacity-90 md:inline-flex">
              Create
            </Link>
          )}
          {user && user.role === "ADMIN" && (
            <Link href="/admin/users" className="hidden min-h-9 items-center rounded-card border border-arena-600 px-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-signal-live lg:inline-flex">
              Users
            </Link>
          )}
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="inline-flex min-h-9 items-center rounded-card border border-arena-600 px-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink hover:border-signal-live hover:text-signal-live">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
