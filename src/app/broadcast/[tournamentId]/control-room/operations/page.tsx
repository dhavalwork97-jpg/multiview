import OperationsClient from "./OperationsClient";

type Props = { params: Promise<{ tournamentId: string }> };

export default async function ControlRoomOperationsPage({ params }: Props) {
  const { tournamentId } = await params;
  return <OperationsClient tournamentId={tournamentId} />;
}
