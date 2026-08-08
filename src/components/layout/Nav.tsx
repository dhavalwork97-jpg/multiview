import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

// Server component: resolves the signed-in user once per request so we
// can decide whether to show the "Dashboard" link (and, inside it,
// whether that user sees the organizer tools) without a client-side
// waterfall. The auth *controls* themselves (SignedIn/SignedOut/
// UserButton) are Clerk's own client components — Next lets a server
// component render those directly, no wrapper needed.
export async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-arena-700 bg-arena-950/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-display text-lg uppercase tracking-wide">
          FGC<span className="text-signal-live">Stream</span>
        </Link>
        <NavLinks />
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <Link
            href="/dashboard"
            className="rounded-card px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-faint transition-colors hover:bg-arena-800 hover:text-ink"
          >
            Dashboard
          </Link>
        )}

        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:border-signal-live hover:text-signal-live"
            >
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}
