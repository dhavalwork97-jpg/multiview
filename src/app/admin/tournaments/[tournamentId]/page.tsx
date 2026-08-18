import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { InteractiveBracket } from "@/components/bracket/InteractiveBracket";
import { StationAssignmentBoard } from "@/components/admin/StationAssignmentBoard";

export default async function AdminTournamentPage({
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
    include: { brackets: { select: { id: true, name: true } } },
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
        </div>
        <nav aria-label="Tournament admin" className="flex max-w-full flex-wrap items-center justify-end gap-2">
          {[
            ["Overview", `/admin/tournaments/${tournament.id}`],
            ["Control Room", `/admin/tournaments/${tournament.id}/control-room`],
            ["Operations", `/admin/tournaments/${tournament.id}/operations`],
            ["Analytics", `/admin/tournaments/${tournament.id}/analytics`],
            ["Report", `/admin/tournaments/${tournament.id}/report`],
            ["Public", `/e/${tournament.slug}`],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="rounded-card border border-arena-600 bg-arena-900 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted transition hover:border-signal-live hover:text-signal-live">
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-ink-muted">
          Station assignment
        </h2>
        <StationAssignmentBoard tournamentId={tournament.id} />
      </section>

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
    </main>
  );
}
