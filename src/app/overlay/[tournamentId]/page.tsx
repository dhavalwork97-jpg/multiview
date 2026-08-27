import { notFound } from "next/navigation";
import { db } from "@/lib/db";

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

  const title =
    typeof overlay.title === "string" && overlay.title.trim()
      ? overlay.title
      : tournament.name;

  const sponsor =
    typeof overlay.sponsor === "string" ? overlay.sponsor : "";

  const message =
    typeof overlay.message === "string" ? overlay.message : "";

  const playerOne = tournament.broadcastState?.match?.playerOne?.gamertag;
  const playerTwo = tournament.broadcastState?.match?.playerTwo?.gamertag;

  const accent = tournament.organization.brandPrimaryColor ?? "#7cf7c5";

  return (
    <main
      className="min-h-screen bg-transparent p-10 text-white"
      style={{ ["--overlay-accent" as string]: accent }}
    >
      <div className="flex min-h-screen flex-col justify-between">
        <div className="flex items-start justify-between">
          <div
            className="border-l-4 bg-black/75 px-6 py-4 backdrop-blur-sm"
            style={{ borderColor: "var(--overlay-accent)" }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
              {tournament.organization.name}
            </p>
            <h1 className="mt-1 font-display text-3xl uppercase tracking-wide">
              {title}
            </h1>
            {message && (
              <p className="mt-2 text-sm text-white/75">{message}</p>
            )}
          </div>

          {sponsor && (
            <div className="bg-black/75 px-5 py-3 font-mono text-xs uppercase tracking-widest backdrop-blur-sm">
              Presented by{" "}
              <span style={{ color: "var(--overlay-accent)" }}>
                {sponsor}
              </span>
            </div>
          )}
        </div>

        {playerOne && playerTwo && (
          <div className="mx-auto bg-black/85 px-8 py-4 text-center backdrop-blur-sm">
            <div className="flex items-center gap-6 font-display text-2xl uppercase">
              <span>{playerOne}</span>
              <span className="font-mono text-sm text-white/50">VS</span>
              <span>{playerTwo}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}