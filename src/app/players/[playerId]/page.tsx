import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;

  const player = await db.player.findUnique({
    where: { id: playerId },
    include: {
      matchesAsP1: {
        include: { playerTwo: true, tournament: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      matchesAsP2: {
        include: { playerOne: true, tournament: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      teamMemberships: { include: { team: true } },
    },
  });

  if (!player) notFound();

  const matches = [
    ...player.matchesAsP1.map((match) => ({
      ...match,
      opponent: match.playerTwo,
    })),
    ...player.matchesAsP2.map((match) => ({
      ...match,
      opponent: match.playerOne,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 20);

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Player profile
        </p>
        <h1 className="mt-1 font-display text-4xl uppercase">
          {player.gamertag}
        </h1>
        {player.realName && (
          <p className="mt-1 text-ink-faint">{player.realName}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {player.teamMemberships.map((membership) => (
            <Link
              key={membership.teamId}
              href={`/teams/${membership.teamId}`}
              className="rounded-card border border-arena-700 px-3 py-2 text-xs hover:border-signal-live"
            >
              {membership.team.name}
            </Link>
          ))}
        </div>

        <section className="mt-8 rounded-card border border-arena-700 bg-arena-900 p-5">
          <h2 className="font-display text-xl uppercase">Match history</h2>
          <div className="mt-3 divide-y divide-arena-700">
            {matches.map((match) => (
              <Link
                key={match.id}
                href={`/watch/${match.id}`}
                className="flex justify-between gap-3 py-3 hover:text-signal-live"
              >
                <span>
                  {player.gamertag} vs {match.opponent.gamertag}
                </span>
                <span className="font-mono text-xs">
                  {match.playerOneScore}—{match.playerTwoScore}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
