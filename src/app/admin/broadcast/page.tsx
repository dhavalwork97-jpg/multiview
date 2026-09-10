import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminBroadcastPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN") redirect(user.role === "ORGANIZER" ? "/organizer" : "/dashboard");

  const tournaments = await db.tournament.findMany({
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: { id: true, name: true, game: true, sport: true, status: true, publicEnabled: true },
  });

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="font-mono text-xs uppercase tracking-widest text-ink-faint hover:text-signal-live">← Admin</Link>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-signal-live">Broadcast operations</p>
            <h1 className="mt-1 font-display text-4xl uppercase">Broadcast center</h1>
            <p className="mt-2 max-w-3xl text-sm text-ink-muted">Every tournament gets a direct broadcast surface. Open the live overlay for OBS/browser-source use or jump into the tournament operations and MultiView tools.</p>
          </div>
          <Link href="/showcase" target="_blank" className="action-secondary">Open showcase</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <article key={tournament.id} className="rounded-card border border-arena-700 bg-arena-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{tournament.sport} · {tournament.game}</p><h2 className="mt-1 font-display text-2xl uppercase">{tournament.name}</h2></div>
                <span className="rounded-full border border-arena-600 px-2 py-1 font-mono text-[9px] uppercase text-ink-faint">{tournament.status}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Link href={`/overlay/${tournament.id}`} target="_blank" className="action-secondary">Live overlay</Link>
                <Link href={`/overlay/standings?tournamentId=${tournament.id}`} target="_blank" className="action-secondary">Standings</Link>
                <Link href={`/admin/tournaments/${tournament.id}/control-room`} className="action-secondary">Control room</Link>
                <Link href={`/admin/tournaments/${tournament.id}/multiview`} className="action-secondary">MultiView</Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-faint">
                <Link href={`/admin/tournaments/${tournament.id}/matches`} className="hover:text-signal-live">Scoring</Link>
                <Link href={`/admin/tournaments/${tournament.id}/standings`} className="hover:text-signal-live">Standings</Link>
                <Link href={`/admin/tournaments/${tournament.id}/analytics`} className="hover:text-signal-live">Analytics</Link>
                <Link href={`/admin/tournaments/${tournament.id}/operations`} className="hover:text-signal-live">Operations</Link>
                {tournament.publicEnabled && <Link href={`/admin/tournaments/${tournament.id}`} className="hover:text-signal-live">Tournament workspace</Link>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
