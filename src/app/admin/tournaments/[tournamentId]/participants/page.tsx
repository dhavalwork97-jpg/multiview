import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTournamentManage } from "@/lib/auth";
import { TeamDirectoryPicker } from "@/components/teams/team-directory-picker";

export default async function ParticipantsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try {
    await requireTournamentManage(tournamentId);
  } catch {
    return notFound();
  }

  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      participantMode: true,
      entrants: { include: { player: true }, orderBy: { seed: "asc" } },
      teams: {
        include: { team: { include: { members: { include: { player: true } } } } },
        orderBy: { seed: "asc" },
      },
    },
  });
  if (!t) notFound();

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href={`/admin/tournaments/${t.id}`} className="font-mono text-xs text-ink-faint">← Tournament admin</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl uppercase">Participants</h1>
            <p className="text-sm text-ink-faint">{t.name} · mode: {t.participantMode}</p>
          </div>
          <Link href={`/admin/tournaments/${t.id}/data`} className="action-secondary">Import / Export</Link>
        </div>

        {t.participantMode !== "individual" && (
          <div className="mt-6">
            <TeamDirectoryPicker tournamentId={t.id} />
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-card border border-arena-700 bg-arena-900 p-5">
            <h2 className="font-display text-xl uppercase">Individuals</h2>
            <div className="mt-3 divide-y divide-arena-700">
              {t.entrants.map((e) => (
                <div key={e.id} className="flex justify-between gap-3 py-3">
                  <span>{e.player.gamertag}</span>
                  <span className="font-mono text-xs text-ink-faint">Seed {e.seed ?? "—"} · {e.eliminated ? "Eliminated" : "Active"}</span>
                </div>
              ))}
              {t.entrants.length === 0 && <p className="py-3 text-sm text-ink-faint">No individual entrants.</p>}
            </div>
          </section>

          <section className="rounded-card border border-arena-700 bg-arena-900 p-5">
            <h2 className="font-display text-xl uppercase">Teams</h2>
            <div className="mt-3 divide-y divide-arena-700">
              {t.teams.map((e) => (
                <div key={e.id} className="flex gap-3 py-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-arena-700 bg-arena-950">
                    {e.team.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.team.logoUrl} alt={`${e.team.name} logo`} className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="font-display text-lg text-ink-faint">{e.team.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">{e.team.name}</span>
                      <span className="font-mono text-xs text-ink-faint">Seed {e.seed ?? "—"}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">{e.team.members.map((m) => m.player.gamertag).join(" / ") || "No roster"}</p>
                  </div>
                </div>
              ))}
              {t.teams.length === 0 && <p className="py-3 text-sm text-ink-faint">No teams entered.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
