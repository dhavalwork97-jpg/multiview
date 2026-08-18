import Link from "next/link";
import { db } from "@/lib/db";

export default async function TeamsPage() {
  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    take: 100,
    include: { _count: { select: { members: true, tournaments: true } } },
  });

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Competition registry</p>
        <h1 className="mt-1 font-display text-4xl uppercase">Teams</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">Teams can represent esports squads, football clubs, basketball teams, doubles partnerships, or any other multi-participant side.</p>
        {teams.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-arena-600 p-8 text-sm text-ink-muted">No teams have been created yet.</div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`} className="rounded-card border border-arena-700 bg-arena-900 p-5 transition hover:border-signal-live">
                <h2 className="font-display text-2xl uppercase">{team.name}</h2>
                <p className="mt-2 font-mono text-xs text-ink-faint">{team._count.members} members · {team._count.tournaments} tournaments</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
