import { redirect } from "next/navigation";
import Link from "next/link";
import { getTournamentAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { StationOpsDashboard } from "@/components/admin/StationOpsDashboard";

export default async function TournamentOpsPage({
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
  if (!access.isPlatformAdmin && access.role === "VIEWER") redirect("/dashboard");

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, game: true },
  });
  if (!tournament) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-arena-950 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint">{tournament.game} · station operations</p>
            <h1 className="mt-1 font-display text-3xl uppercase tracking-wide">{tournament.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">Live station health, encoder telemetry and queue readiness.</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/tournaments/${tournament.id}`} className="action-secondary">Back to admin</Link>
            <Link href={`/admin/tournaments/${tournament.id}/control-room`} className="action-secondary">Control room</Link>
          </div>
        </header>
        <StationOpsDashboard tournamentId={tournament.id} />
      </div>
    </main>
  );
}
