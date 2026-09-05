import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrimaryOrganizationMembership } from "@/lib/organization";

export const dynamic = "force-dynamic";

const navigation = [
  ["/organizer", "Overview"],
  ["/admin/tournaments/new", "Create tournament"],
  ["/tournaments", "Tournaments"],
  ["/teams", "Teams"],
  ["/players", "Players"],
  ["/multiview", "Broadcast"],
  ["/organization/settings", "Organization"],
] as const;

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-arena-950 text-ink">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-arena-800 bg-arena-950/95 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-signal-live">FGC / Organizer</p>
              <h1 className="mt-1 font-display text-2xl uppercase tracking-tight">Control Center</h1>
            </div>
            <Link href="/dashboard" className="action-secondary lg:mt-6">Viewer dashboard</Link>
          </div>
          <nav aria-label="Organizer navigation" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {navigation.map(([href, label], index) => (
              <Link key={href} href={href} className={index === 0 ? "surface-card border-signal-live/40 bg-signal-live/[0.08] px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink" : "surface-card surface-card-interactive px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted"}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 hidden border-t border-arena-800 pt-5 lg:block">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">Organizer workspace</p>
            <p className="mt-2 text-sm text-ink-muted">Manage events, competitors, broadcast stations and results without viewer-only distractions.</p>
          </div>
        </aside>
        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
