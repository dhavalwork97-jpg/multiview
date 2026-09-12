import RundownClient from "./RundownClient";

type Props = { params: Promise<{ tournamentId: string }> };

export default async function ControlRoomRundownPage({ params }: Props) {
  const { tournamentId } = await params;
  return <RundownClient tournamentId={tournamentId} />;
}
