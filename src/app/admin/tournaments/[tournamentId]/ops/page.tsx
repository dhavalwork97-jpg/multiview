import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StationOpsDashboard } from "@/components/admin/StationOpsDashboard";

export default async function TournamentOpsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, game: true },
  });
  if (!tournament) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            {tournament.game}
          </p>
          <h1 className="font-display text-3xl uppercase tracking-wide">{tournament.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">Live ops</p>
        </div>
        <Link
          href={`/admin/tournaments/${tournament.id}`}
          className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-faint transition-colors hover:border-signal-live hover:text-signal-live"
        >
          Back to admin
        </Link>
      </header>

      <StationOpsDashboard tournamentId={tournament.id} />
    </main>
  );
}
