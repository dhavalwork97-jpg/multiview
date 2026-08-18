import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BracketExplorer } from "@/components/bracket/BracketExplorer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { name: true, game: true, status: true },
  });
  if (!tournament) return { title: "Tournament" };
  return {
    title: `${tournament.name} · ${tournament.game}`,
    description: `${tournament.name} live tournament hub — watch individual matches, follow brackets, and track results.`,
  };
}

// Public spectator-facing event hub. All data here is database-backed; it
// deliberately does not poll YouTube so sharing/refreshing the page cannot
// consume the project's daily YouTube quota.
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
      slug: true,
      bestOf: true,
      format: true,
      publicEnabled: true,
      game: true,
      sport: true,
      participantMode: true,
      scoringMode: true,
      status: true,
      venue: true,
      startDate: true,
      organization: { select: { name: true, tagline: true, brandLogoUrl: true, brandPrimaryColor: true, brandAccentColor: true } },
      sponsors: { where: { active: true }, orderBy: { weight: "desc" }, take: 8 },
      teams: { include: { team: { select: { id: true, name: true, logoUrl: true } } }, orderBy: { seed: "asc" } },
      brackets: { select: { id: true, name: true } },
      matches: {
        where: { status: { in: ["LIVE", "COMPLETED"] } },
        orderBy: { updatedAt: "desc" },
        take: 18,
        select: {
          id: true,
          status: true,
          round: true,
          playerOneScore: true,
          playerTwoScore: true,
          youtubeVideoId: true,
          playerOne: { select: { gamertag: true } },
          playerTwo: { select: { gamertag: true } },
          sides: { include: { participants: { include: { player: { select: { gamertag: true } }, team: { select: { name: true } } } } } },
          station: { select: { label: true } },
        },
      },
    },
  });

  if (!tournament || !tournament.publicEnabled) notFound();

  const liveMatches = tournament.matches.filter((m) => m.status === "LIVE");
  const completedMatches = tournament.matches.filter((m) => m.status === "COMPLETED");

  return (
    <main className="min-h-screen bg-arena-950 px-4 py-8 sm:px-6">
      <header className="mx-auto mb-8 max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              {tournament.game} · {tournament.sport}{tournament.venue ? ` · ${tournament.venue}` : ""}
            </p>
            <h1 className="mt-1 font-display text-3xl uppercase tracking-wide sm:text-4xl">{tournament.name}</h1>
            <p className="mt-2 text-sm text-ink-faint">
              {tournament.status} · {new Date(tournament.startDate).toLocaleDateString()}
            </p>
          </div>
          <Link
            href="/tournaments"
            className="w-fit rounded-card border border-arena-600 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ink-faint hover:border-signal-live hover:text-signal-live"
          >
            All tournaments
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8" style={{ ["--event-accent" as string]: tournament.organization.brandPrimaryColor ?? "#7cf7c5" } as CSSProperties}>
        <section className="rounded-card border border-arena-700 bg-arena-900 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-4">
            {tournament.organization.brandLogoUrl && <img src={tournament.organization.brandLogoUrl} alt="" className="h-12 w-12 rounded-card object-cover" />}
            <div><p className="font-mono text-[10px] uppercase tracking-widest text-signal-live">{tournament.organization.name}</p><p className="text-sm text-ink-faint">{tournament.organization.tagline ?? "Official event broadcast hub"}</p></div>
          </div>
        </section>

        {tournament.sponsors.length > 0 && <section className="rounded-card border border-arena-700 bg-arena-900 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Presented by</p>
          <div className="mt-3 flex flex-wrap gap-3">{tournament.sponsors.map(s => <a key={s.id} href={s.websiteUrl ?? "#"} target="_blank" rel="noreferrer" onClick={() => fetch("/api/sponsors/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id }) }).catch(() => {})} className="rounded-card border border-arena-700 px-4 py-2 hover:border-signal-live">{s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="h-8 max-w-28 object-contain" /> : s.name}</a>)}</div>
        </section>}

        {tournament.teams.length > 0 && <section><div className="mb-3"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Competitors</p><h2 className="font-display text-xl uppercase tracking-wide">Teams</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tournament.teams.slice(0,12).map(({team}) => <Link key={team.id} href={`/teams/${team.id}`} className="rounded-card border border-arena-700 bg-arena-900 p-4 hover:border-signal-live">{team.logoUrl&&<img src={team.logoUrl} alt="" className="h-10 w-10 rounded object-cover" />}<p className="mt-2 font-display uppercase">{team.name}</p></Link>)}</div></section>}

      <div className="space-y-8">
        <section className="rounded-card border border-arena-600 bg-arena-900 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Broadcast floor</p>
              <h2 className="font-display text-xl uppercase tracking-wide">Live now</h2>
            </div>
            <span className="font-mono text-[10px] uppercase text-ink-faint">{liveMatches.length} active</span>
          </div>

          {liveMatches.length === 0 ? (
            <div className="rounded-card border border-dashed border-arena-600 p-6 text-center">
              <p className="font-display text-lg uppercase">No matches live</p>
              <p className="mt-1 text-sm text-ink-faint">Check the bracket below for upcoming games.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {liveMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/watch/${match.id}`}
                  className="rounded-card border border-signal-live/40 bg-arena-950 p-4 transition-colors hover:border-signal-live"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-signal-live">
                      <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-signal-live" /> Live
                    </span>
                    <span className="font-mono text-[10px] uppercase text-ink-faint">{match.station?.label ?? "Station"}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <span className="truncate font-display text-lg uppercase">{match.sides.find(s => s.sideKey === "A")?.participants.map(p => p.player?.gamertag ?? p.team?.name ?? p.displayName).join(" / ") ?? match.playerOne?.gamertag ?? "Side A"}</span>
                    <span className="font-mono text-xs text-ink-faint">VS</span>
                    <span className="truncate text-right font-display text-lg uppercase">{match.sides.find(s => s.sideKey === "B")?.participants.map(p => p.player?.gamertag ?? p.team?.name ?? p.displayName).join(" / ") ?? match.playerTwo?.gamertag ?? "Side B"}</span>
                  </div>
                  <p className="mt-3 text-xs text-ink-faint">{match.round} · Watch this game</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Competition</p>
            <h2 className="font-display text-xl uppercase tracking-wide">Brackets</h2>
          </div>
          <BracketExplorer brackets={tournament.brackets} tournamentId={tournament.id} />
        </section>

        {completedMatches.length > 0 && (
          <section className="rounded-card border border-arena-600 bg-arena-900 p-4 sm:p-5">
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Results</p>
              <h2 className="font-display text-xl uppercase tracking-wide">Recent matches</h2>
            </div>
            <div className="divide-y divide-arena-700">
              {completedMatches.slice(0, 8).map((match) => (
                <Link key={match.id} href={`/watch/${match.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-signal-live">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{match.sides.find(s => s.sideKey === "A")?.participants.map(p => p.player?.gamertag ?? p.team?.name ?? p.displayName).join(" / ") ?? match.playerOne?.gamertag ?? "Side A"} <span className="text-ink-faint">vs</span> {match.sides.find(s => s.sideKey === "B")?.participants.map(p => p.player?.gamertag ?? p.team?.name ?? p.displayName).join(" / ") ?? match.playerTwo?.gamertag ?? "Side B"}</p>
                    <p className="font-mono text-[10px] uppercase text-ink-faint">{match.round} · {match.station?.label ?? "Station"}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm">{match.playerOneScore} — {match.playerTwoScore}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      </div>
    </main>
  );
}
