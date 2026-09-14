import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";
import OrganizerProductionMultiview from "@/components/organizer/OrganizerProductionMultiview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ tournamentId?: string }> };

export default async function OrganizerMultiviewPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const { tournamentId } = await searchParams;
  const where = user.role === "ADMIN"
    ? {}
    : { OR: [{ organizationId: membership?.organizationId ?? "__none__" }, ...(user.role === "ORGANIZER" ? [{ organizerId: user.id }] : [])] };

  const tournaments = await db.tournament.findMany({
    where,
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 20,
    select: { id: true, name: true, game: true, status: true },
  });

  const tournament = tournaments.find((item) => item.id === tournamentId) ?? tournaments.find((item) => item.status === "LIVE") ?? tournaments[0];
  if (!tournament) {
    return <main className="min-h-screen bg-[#050817] p-6 text-white"><div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center"><p className="font-mono text-[9px] uppercase tracking-[.2em] text-cyan-300/60">Organizer workspace</p><h1 className="mt-2 font-display text-3xl font-bold uppercase">No tournaments yet</h1><p className="mt-2 text-sm text-white/35">Create a tournament first, then use Production Multiview to monitor its stations.</p><Link href="/organizer" className="mt-6 inline-flex rounded-lg bg-white px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-black">Back to Command</Link></div></main>;
  }

  const stations = await db.station.findMany({
    where: { tournamentId: tournament.id },
    orderBy: [{ status: "asc" }, { label: "asc" }],
    take: 9,
    select: {
      id: true,
      label: true,
      status: true,
      playbackIdHls: true,
      youtubeVideoId: true,
      currentBitrateKbps: true,
      droppedFrames: true,
      matches: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          round: true,
          status: true,
          playerOneScore: true,
          playerTwoScore: true,
          playerOne: { select: { gamertag: true } },
          playerTwo: { select: { gamertag: true } },
        },
      },
    },
  });

  const serialized = stations.map((station) => {
    const match = station.matches[0];
    return {
      id: station.id,
      label: station.label,
      status: String(station.status),
      playbackIdHls: station.playbackIdHls,
      youtubeVideoId: station.youtubeVideoId,
      bitrate: station.currentBitrateKbps,
      droppedFrames: station.droppedFrames,
      match: match ? {
        id: match.id,
        round: match.round,
        status: String(match.status),
        playerOne: match.playerOne?.gamertag ?? null,
        playerTwo: match.playerTwo?.gamertag ?? null,
        playerOneScore: match.playerOneScore,
        playerTwoScore: match.playerTwoScore,
      } : null,
    };
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050817] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-2xl border border-white/10 bg-[#070c1d]/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[.18em] text-cyan-300/65"><span>Organizer Workspace</span><span className="text-white/15">/</span><span>Production Multiview</span></div>
              <h1 className="mt-2 truncate font-display text-3xl font-extrabold uppercase tracking-[.01em] sm:text-4xl">{tournament.name}</h1>
              <p className="mt-1 text-xs text-white/35">{tournament.game} · monitor every station without leaving tournament operations.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/organizer" className="rounded-lg border border-white/10 px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[.12em] text-white/50 hover:text-white">Command</Link>
              <Link href={`/admin/tournaments/${tournament.id}/control-room`} className="rounded-lg bg-white px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[.12em] text-black">Control Room</Link>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto border-t border-white/[.07] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tournaments.map((item) => <Link key={item.id} href={`/organizer/multiview?tournamentId=${item.id}`} className={`shrink-0 rounded-lg border px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[.1em] ${item.id === tournament.id ? "border-cyan-300/25 bg-cyan-300/[.07] text-cyan-200" : "border-white/10 text-white/35 hover:text-white"}`}>{item.name}</Link>)}
          </div>
        </header>

        <OrganizerProductionMultiview stations={serialized} />
      </div>
    </main>
  );
}
