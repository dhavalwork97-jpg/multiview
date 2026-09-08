import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganizerNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const organizationId = membership?.organizationId;
  const notifications = organizationId
    ? await db.notification.findMany({
        where: { organizationId, OR: [{ userId: null }, { userId: user.id }] },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true, type: true, title: true, message: true, href: true, readAt: true, createdAt: true },
      })
    : [];

  const unread = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.28em] text-signal-live">V32 / signal</p>
          <h1 className="mt-2 font-display text-4xl uppercase tracking-tight">Organizer inbox</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-faint">Operational signals from the existing notification system, brought into one calm command surface.</p>
        </div>
        <Link href="/organizer" className="action-secondary self-start">← Command deck</Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5"><p className="section-label">Unread</p><p className="mt-2 text-3xl font-black">{unread}</p><p className="mt-1 text-xs text-ink-faint">needs attention</p></div>
        <div className="surface-card p-5"><p className="section-label">Signals</p><p className="mt-2 text-3xl font-black">{notifications.length}</p><p className="mt-1 text-xs text-ink-faint">latest 40</p></div>
        <div className="surface-card p-5"><p className="section-label">Scope</p><p className="mt-2 text-3xl font-black">ORG</p><p className="mt-1 text-xs text-ink-faint">workspace + personal</p></div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-arena-800 px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[.2em] text-signal-live">Signal stream</p></div>
        {notifications.length ? (
          <div className="divide-y divide-arena-800">
            {notifications.map((item) => (
              <article key={item.id} className={`px-5 py-5 transition-colors hover:bg-arena-900/50 ${item.readAt ? "" : "bg-signal-live/[.035]"}`}>
                <div className="flex gap-4">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.readAt ? "bg-arena-700" : "bg-signal-live shadow-[0_0_16px_rgba(124,247,197,.65)]"}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{String(item.type)}</span>{!item.readAt && <span className="status-live">New</span>}</div>
                    <h2 className="mt-1 font-semibold text-ink">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">{item.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3"><time className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{new Date(item.createdAt).toLocaleString()}</time>{item.href && <Link href={item.href} className="text-xs font-semibold text-signal-live hover:underline">Open signal →</Link>}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="px-5 py-14 text-center"><p className="font-display text-2xl uppercase">Quiet channel</p><p className="mt-2 text-sm text-ink-faint">No organizer notifications are waiting right now.</p></div>}
      </section>
    </div>
  );
}
