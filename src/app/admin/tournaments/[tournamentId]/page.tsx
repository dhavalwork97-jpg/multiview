import { redirect } from "next/navigation";
import Link from "next/link";
import { getTournamentAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { InteractiveBracket } from "@/components/bracket/InteractiveBracket";
import { StationAssignmentBoard } from "@/components/admin/StationAssignmentBoard";
import { TournamentAdminNav } from "@/components/admin/TournamentAdminNav";

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  let access;
  try {
    access = await getTournamentAccess(tournamentId);
  } catch {
    redirect("/dashboard");
  }

  if (!access.isPlatformAdmin && (access.role === "VIEWER")) {
    redirect("/dashboard");
  }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      slug: true,
      sport: true,
      game: true,
      participantMode: true,
      scoringMode: true,
      brackets: { select: { id: true, name: true } },
      stages: { orderBy: { orderIndex: "asc" }, select: { id: true, name: true, kind: true, status: true, _count: { select: { matches: true } } } },
    },
  });

  if (!tournament) redirect("/dashboard");

  const isBattleRoyale =
    tournament.sport === "bgmi" || tournament.scoringMode === "battle_royale";

  const isMultiStage =
    tournament.stages.length > 1 && !isBattleRoyale;

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            {tournament.sport} · {tournament.game} · {tournament.participantMode}
          </p>
          <h1 className="font-display text-3xl uppercase tracking-wide">{tournament.name}</h1>
        </div>
        <Link
          href={`/admin/tournaments/${tournament.id}/control-room`}
          className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-faint transition-colors hover:border-signal-live hover:text-signal-live"
        >
          Control room
        </Link>
      </header>

      <div className="mb-8"><TournamentAdminNav tournamentId={tournament.id} slug={tournament.slug} /></div>
      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">
          Station assignment
        </h2>
        <StationAssignmentBoard tournamentId={tournament.id} />
      </section>

      {isBattleRoyale ? (
        <section>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">Battle Royale</h2>
          <div className="rounded-card border border-arena-700 bg-arena-900 p-5"><p className="text-sm text-ink-muted">This competition is standings-driven. No bracket is used.</p><Link href={`/admin/tournaments/${tournament.id}/standings`} className="action-secondary mt-4 inline-flex">Open standings</Link></div>
        </section>
      ) : isMultiStage ? (
        <section>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">Competition stages</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tournament.stages.map((stage, index) => (
              <div key={stage.id} className="rounded-card border border-arena-700 bg-arena-900 p-4">
                <div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase text-ink-faint">Stage {index + 1}</span><span className="font-mono text-[10px] uppercase text-ink-faint">{stage.status}</span></div>
                <h3 className="mt-2 font-display uppercase">{stage.name}</h3>
                <p className="mt-1 text-xs text-ink-faint">{stage.kind} · {stage._count.matches} matches</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Link href={`/admin/tournaments/${tournament.id}/matches`} className="action-secondary">Live scoring</Link><Link href={`/admin/tournaments/${tournament.id}/standings`} className="action-secondary">Standings</Link></div>
        </section>
      ) : (
        <section>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">
            Bracket
          </h2>
          {tournament.brackets.length === 0 ? (
            <p className="text-sm text-ink-faint">No bracket imported yet.</p>
          ) : (
            tournament.brackets.map((b) => (
              <div key={b.id} className="mb-8">
                <p className="mb-2 text-sm font-medium text-ink-muted">{b.name}</p>
                <InteractiveBracket bracketId={b.id} tournamentId={tournament.id} />
              </div>
            ))
          )}
        </section>
      )}
    </main>
  );
}
