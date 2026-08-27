import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LiveOverlay } from "@/components/overlay/LiveOverlay";

export const dynamic = "force-dynamic";

export default async function OverlayPage({
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
      publicEnabled: true,
      organization: {
        select: {
          name: true,
          brandPrimaryColor: true,
        },
      },
      broadcastState: {
        select: {
          overlay: true,
          match: {
            select: {
              playerOne: { select: { gamertag: true } },
              playerTwo: { select: { gamertag: true } },
            },
          },
        },
      },
    },
  });

  if (!tournament || !tournament.publicEnabled) notFound();

  const overlay =
    tournament.broadcastState?.overlay &&
    typeof tournament.broadcastState.overlay === "object" &&
    !Array.isArray(tournament.broadcastState.overlay)
      ? (tournament.broadcastState.overlay as Record<string, unknown>)
      : {};

  const playerOne =
    tournament.broadcastState?.match?.playerOne?.gamertag ?? null;
  const playerTwo =
    tournament.broadcastState?.match?.playerTwo?.gamertag ?? null;
  const accent =
    tournament.organization.brandPrimaryColor ?? "#7cf7c5";

  return (
    <LiveOverlay
      tournamentId={tournamentId}
      tournamentName={tournament.name}
      organizationName={tournament.organization.name}
      accent={accent}
      initialOverlay={overlay}
      initialPlayerOne={playerOne}
      initialPlayerTwo={playerTwo}
    />
  );
}
