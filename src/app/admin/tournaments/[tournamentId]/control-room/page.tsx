import { redirect } from "next/navigation";
import { requireTournamentAccess } from "@/lib/auth";

export default async function TournamentControlRoomPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  try {
    await requireTournamentAccess(tournamentId);
  } catch {
    redirect("/dashboard");
  }

  // The tournament "Manage → Control room" entry point must land on the
  // production broadcast studio, which contains the manual Program/Preview
  // scene controls, OBS mapping, timeline assist, replay, sponsor and overlay
  // tooling. Keep scene selection operator-controlled; never auto-switch scenes.
  redirect(`/broadcast/${tournamentId}/control-room`);
}
