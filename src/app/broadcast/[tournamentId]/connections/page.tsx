import { redirect } from "next/navigation";
import { requireTournamentAccess } from "@/lib/auth";
import BroadcastConnections from "./BroadcastConnections";

type Props = { params: Promise<{ tournamentId: string }> };

export default async function BroadcastConnectionsPage({ params }: Props) {
  const { tournamentId } = await params;

  try {
    await requireTournamentAccess(tournamentId);
  } catch {
    redirect("/dashboard");
  }

  return <BroadcastConnections tournamentId={tournamentId} />;
}
