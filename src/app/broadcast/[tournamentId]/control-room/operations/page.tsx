import OperationsClient from "./OperationsClient";
import StationAssignmentBoard from "./StationAssignmentBoard";

type Props = { params: Promise<{ tournamentId: string }> };

export default async function ControlRoomOperationsPage({ params }: Props) {
  const { tournamentId } = await params;
  return (
    <>
      <StationAssignmentBoard tournamentId={tournamentId} />
      <OperationsClient tournamentId={tournamentId} />
    </>
  );
}
