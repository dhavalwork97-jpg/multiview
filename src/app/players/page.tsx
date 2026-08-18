import Link from "next/link";
import { db } from "@/lib/db";

export default async function PlayersPage() {
  const players = await db.player.findMany({
    orderBy: { gamertag: "asc" },
    take: 200,
    include: { _count: { select: { teamMemberships: true, matchParticipants: true } } },
  });

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Competition registry</p>
        <h1 className="mt-1 font-display text-4xl uppercase">Players</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">The same participant registry works across individual, team, doubles, mixed, and esports competitions.</p>
        {players.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-arena-600 p-8 text-sm text-ink-muted">No players have been registered yet.</div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {players.map((player) => (
              <Link key={player.id} href={`/players/${player.id}`} className="rounded-card border border-arena-700 bg-arena-900 p-4 transition hover:border-signal-live">
                <h2 className="font-display text-xl uppercase">{player.gamertag}</h2>
                {player.realName && <p className="mt-1 text-xs text-ink-faint">{player.realName}</p>}
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint">{player._count.matchParticipants} match sides · {player._count.teamMemberships} teams</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
