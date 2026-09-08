import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrimaryOrganizationMembership } from "@/lib/organization";

export const dynamic = "force-dynamic";

const baseNavigation = [
  ["/organizer", "Overview"],
  ["/organizer/registrations", "Registration"],
  ["/organizer/schedule", "Schedule radar"],
  ["/organizer/moderation", "Moderator Center"],
  ["/organizer/notifications", "Signal inbox"],
  ["/admin/tournaments/new", "Create tournament"],
  ["/tournaments", "Tournaments"],
  ["/teams", "Teams"],
  ["/players", "Players"],
  ["/multiview", "Broadcast"],
  ["/billing", "Billing"],
] as const;

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const canManageOrganization = user.role === "ADMIN" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  const navigation = canManageOrganization
    ? [...baseNavigation, ["/organization/settings", "Organization"] as const]
    : baseNavigation;

  return (
    <main className="min-h-screen bg-arena-950 text-ink">
      <div className="mx-auto flex max-w-[1680px] flex-col lg:flex-row">
        <aside className="border-b border-arena-700/80 bg-arena-950/90 p-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[.24em] text-signal-live">FGC / Organizer</p>
              <h1 className="mt-1 font-display text-3xl uppercase leading-none tracking-tight">Control Center</h1>
              <p className="mt-2 hidden max-w-xs text-xs leading-5 text-ink-faint lg:block">Run the event from registration through broadcast, results and community operations.</p>
            </div>
            <Link href="/dashboard" className="action-secondary lg:mt-6">Viewer dashboard</Link>
          </div>

          <nav aria-label="Organizer navigation" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {navigation.map(([href, label], index) => (
              <Link key={href} href={href} className={index === 0 ? "group rounded-[10px] border border-signal-live/30 bg-signal-live/[.07] px-3.5 py-3 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-ink shadow-[0_0_28px_rgba(58,222,124,.04)]" : "group rounded-[10px] border border-arena-700/80 bg-arena-900/50 px-3.5 py-3 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-ink-muted transition-all hover:-translate-y-px hover:border-arena-500 hover:bg-arena-800 hover:text-ink"}>
                <span className="flex items-center justify-between gap-2">
                  {label}
                  <span className="text-arena-500 transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-6 hidden border-t border-arena-800 pt-5 lg:block">
            <p className="font-mono text-[9px] uppercase tracking-[.18em] text-ink-faint">Workspace principle</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Organizer tools stay operational and focused. Viewer discovery, social and watch experiences remain in the main product.</p>
          </div>
        </aside>
        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
