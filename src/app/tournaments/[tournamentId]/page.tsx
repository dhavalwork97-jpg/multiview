import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BracketExplorer } from "@/components/bracket/BracketExplorer";

// Public viewer-facing tournament page. Distinct from
// /admin/tournaments/:tournamentId (organizer-only station assignment) —
// this one is what a spectator lands on to browse the bracket and pick a
// game to watch. No auth required, same as the live grid and watch pages.
export default async function TournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      game: true,
      status: true,
      venue: true,
      brackets: { select: { id: true, name: true } },
    },
  });

  if (!tournament) notFound();

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          {tournament.game}
          {tournament.venue ? ` · ${tournament.venue}` : ""}
        </p>
        <h1 className="font-display text-3xl uppercase tracking-wide">{tournament.name}</h1>
      </header>

      <BracketExplorer brackets={tournament.brackets} />
    </main>
  );
}
