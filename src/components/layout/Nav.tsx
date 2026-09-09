import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

export async function Nav() {
  const user = await getCurrentUser();
  const canManage = user?.role === "ADMIN" || user?.role === "ORGANIZER";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070b]/80 shadow-[0_18px_70px_rgba(0,0,0,.5)] backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[4.5rem] max-w-[1680px] items-center gap-2 px-3 sm:gap-4 sm:px-5 lg:px-7">
        <Link href="/" aria-label="FGC Stream home" className="group shrink-0 rounded-xl px-1 py-2 outline-none transition-transform hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-[#7c5cff]/70">
          <span className="block font-mono text-[8px] font-bold uppercase tracking-[.26em] text-white/40">FGC • Esports</span>
          <span className="block font-display text-[29px] font-bold uppercase leading-[.82] tracking-[.07em] text-white sm:text-[32px]">
            FGC<span className="fgc-gradient-text">Stream</span>
          </span>
        </Link>
        <div className="hidden h-8 w-px shrink-0 bg-white/10 sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLinks showDashboard={Boolean(user)} showAdmin={canManage} />
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          <Link href="/pricing" className="action-ghost min-h-10">Plans</Link>
          {user && <Link href="/dashboard" className="action-secondary min-h-10">Dashboard</Link>}
          {canManage && <Link href="/admin/tournaments/new" className="action-primary min-h-10 bg-[#7c5cff] shadow-[0_10px_34px_rgba(124,92,255,.2)] hover:brightness-110">Create tournament</Link>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-2 sm:gap-2 sm:pl-3">
          {user?.role === "ADMIN" && <Link href="/admin/users" className="hidden min-h-10 items-center rounded-[10px] border border-white/10 px-3 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-white/60 transition-all hover:border-[#7c5cff]/60 hover:bg-white/5 hover:text-white lg:inline-flex">Users</Link>}
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><SignInButton mode="modal"><button type="button" className="action-secondary min-h-10">Sign in</button></SignInButton></SignedOut>
        </div>
      </div>
    </header>
  );
}
