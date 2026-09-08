import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganizerSchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const tournaments = await db.tournament.findMany({
    where: user.role === "ADMIN" ? {} : {
      OR: [
        { organizationId: membership?.organizationId ?? "__none__" },
        ...(user.role === "ORGANIZER" ? [{ organizerId: user.id }] : []),
      ],
    },
    orderBy: { startDate: "asc" },
    take: 12,
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      venue: true,
      _count: { select: { matches: true } },
      matches: {
        orderBy: [{ roundIndex: "asc" }, { matchIndex: "asc" }, { createdAt: "asc" }],
        take: 18,
        select: {
          id: true,
          status: true,
          round: true,
          startedAt: true,
          endedAt: true,
          playerOne: { select: { gamertag: true } },
          playerTwo: { select: { gamertag: true } },
          station: { select: { label: true, status: true } },
          stage: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-7">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.28em] text-signal-live">V32 / operations</p>
            <h1 className="mt-2 font-display text-4xl uppercase tracking-tight">Schedule radar</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-faint">A single operating view of upcoming competition, live matches and station assignments using the existing competition engine.</p>
          </div>
          <Link href="/organizer" className="action-secondary">← Command deck</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Events", tournaments.length, "workspace schedule"],
          ["Matches", tournaments.reduce((sum, t) => sum + t._count.matches, 0), "across visible events"],
          ["Live", tournaments.filter((t) => String(t.status).toUpperCase() === "LIVE").length, "events on air"],
        ].map(([label, value, copy]) => (
          <div key={String(label)} className="surface-card p-5">
            <p className="font-mono text-[9px] uppercase tracking-[.2em] text-ink-faint">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs text-ink-faint">{copy}</p>
          </div>
        ))}
      </section>

      <div className="space-y-5">
        {tournaments.map((tournament) => (
          <section key={tournament.id} className="surface-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-arena-800 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl uppercase">{tournament.name}</h2>
                  <span className="status-neutral">{String(tournament.status)}</span>
                </div>
                <p className="mt-1 text-xs text-ink-faint">{new Date(tournament.startDate).toLocaleString()} {tournament.venue ? `· ${tournament.venue}` : ""} · {tournament._count.matches} matches</p>
              </div>
              <Link href={`/admin/tournaments/${tournament.id}`} className="action-secondary self-start">Manage event</Link>
            </div>

            <div className="divide-y divide-arena-800">
              {tournament.matches.length ? tournament.matches.map((match, index) => {
                const p1 = match.playerOne?.gamertag ?? "TBD";
                const p2 = match.playerTwo?.gamertag ?? "TBD";
                const live = String(match.status).toUpperCase() === "LIVE";
                return (
                  <div key={match.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">#{String(index + 1).padStart(2, "0")}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={live ? "status-live" : "status-neutral"}>{live ? "LIVE" : String(match.status)}</span>
                        {match.stage?.name && <span className="text-[10px] text-ink-faint">{match.stage.name}</span>}
                        {match.round && <span className="font-mono text-[9px] uppercase text-ink-faint">{match.round}</span>}
                      </div>
                      <p className="mt-2 font-display text-lg uppercase">{p1} <span className="text-ink-faint">vs</span> {p2}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{match.station?.label ?? "Unassigned"}</p>
                      <p className="mt-1 text-[10px] text-ink-faint">{match.startedAt ? `Started ${new Date(match.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Awaiting start"}</p>
                    </div>
                  </div>
                );
              }) : <div className="p-8 text-sm text-ink-faint">No matches have been created yet.</div>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
