import { redirect } from "next/navigation";
import Link from "next/link";
import { requireTournamentAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { TournamentControlRoom } from "@/components/admin/TournamentControlRoom";
import { TournamentAdminNav } from "@/components/admin/TournamentAdminNav";

export default async function TournamentControlRoomPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  try { await requireTournamentAccess(tournamentId); } catch { redirect("/dashboard"); }

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, game: true, slug: true },
  });
  if (!tournament) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-arena-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]"><div className="mb-6"><TournamentAdminNav tournamentId={tournament.id} slug={tournament.slug} /></div><header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">Tournament control room</p>
          <h1 className="mt-1 font-display text-3xl uppercase tracking-wide">{tournament.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">{tournament.game} · multi-station broadcast operations</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/tournaments/${tournament.id}`}
            className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-faint hover:border-signal-live hover:text-signal-live"
          >
            Admin
          </Link>
          <Link
            href={`/admin/tournaments/${tournament.id}/ops`}
            className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-faint hover:border-signal-live hover:text-signal-live"
          >
            Health only
          </Link>
        </div>
      </header>
      <TournamentControlRoom tournamentId={tournament.id} />
    </div></main>
  );
}
