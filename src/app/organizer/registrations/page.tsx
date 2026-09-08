import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganizerRegistrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed =
    user.role === "ADMIN" ||
    user.role === "ORGANIZER" ||
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const tournaments = await db.tournament.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { organizationId: membership?.organizationId ?? "__none__" },
              ...(user.role === "ORGANIZER" ? [{ organizerId: user.id }] : []),
            ],
          },
    orderBy: { startDate: "asc" },
    take: 16,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      startDate: true,
      participantMode: true,
      publicEnabled: true,
      _count: { select: { entrants: true, teams: true, matches: true } },
      entrants: {
        select: {
          id: true,
          seed: true,
          eliminated: true,
          player: { select: { gamertag: true, country: true, avatarUrl: true } },
        },
        orderBy: { seed: "asc" },
        take: 8,
      },
    },
  });

  const registered = tournaments.reduce((sum, t) => sum + t._count.entrants + t._count.teams, 0);
  const readyEvents = tournaments.filter((t) => t._count.entrants + t._count.teams > 0).length;
  const upcoming = tournaments.filter((t) => t.startDate > new Date() && String(t.status) !== "COMPLETED").length;

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal-live">Operations / Entrants</p>
          <h1 className="mt-1 font-display text-4xl uppercase tracking-tight">Registration center</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">One operational view for registration readiness, entrant rosters and the handoff into tournament operations.</p>
        </div>
        <Link href="/organizer" className="action-secondary">Command deck</Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Registered", registered, "Entrants + teams"],
          ["Ready events", readyEvents, "Have at least one competitor"],
          ["Upcoming", upcoming, "Scheduled ahead"],
        ].map(([label, value, note]) => (
          <div key={label} className="surface-card p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
            <p className="mt-2 font-display text-4xl">{value}</p>
            <p className="mt-1 text-xs text-ink-faint">{note}</p>
          </div>
        ))}
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-arena-800 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl uppercase">Event intake board</h2>
              <p className="mt-1 text-xs text-ink-faint">Registration is sourced directly from the tournament participant records.</p>
            </div>
            <span className="rounded-full border border-signal-live/30 bg-signal-live/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-signal-live">Live data</span>
          </div>
        </div>
        <div className="divide-y divide-arena-800">
          {tournaments.map((t) => {
            const competitors = t._count.entrants + t._count.teams;
            const active = t.entrants.filter((e) => !e.eliminated).length;
            const readiness = competitors === 0 ? 0 : Math.min(100, Math.round((active / competitors) * 100));
            return (
              <article key={t.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.9fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg uppercase">{t.name}</h3>
                    <span className="rounded-full border border-arena-700 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-ink-faint">{String(t.status)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{t.participantMode} · {t.startDate.toLocaleString()}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-arena-800"><div className="h-full rounded-full bg-signal-live" style={{ width: `${readiness}%` }} /></div>
                </div>
                <div><p className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">Roster</p><p className="mt-1 font-display text-2xl">{competitors}</p></div>
                <div><p className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">Active</p><p className="mt-1 font-display text-2xl">{active}</p></div>
                <div><p className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">Matches</p><p className="mt-1 font-display text-2xl">{t._count.matches}</p></div>
                <Link href={`/admin/tournaments/${t.id}/participants`} className="action-secondary text-center">Open roster</Link>
              </article>
            );
          })}
          {tournaments.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink-faint">No tournaments are assigned to this organizer workspace yet.</div>}
        </div>
      </section>

      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-signal-live">Check-in handoff</p>
            <h2 className="mt-1 font-display text-xl uppercase">Keep the venue desk on the same roster</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">The current entrant model tracks registration and elimination state. Physical check-in timestamps are intentionally not fabricated; this center is ready for the check-in action layer once that field is introduced.</p>
          </div>
          <Link href="/organizer/schedule" className="action-primary">Open schedule radar</Link>
        </div>
      </section>
    </main>
  );
}
