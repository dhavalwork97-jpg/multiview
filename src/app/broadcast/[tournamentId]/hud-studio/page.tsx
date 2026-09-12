import HudStudioClient from "./HudStudioClient";

type Props = {
  params: Promise<{ tournamentId: string }>;
};

export default async function HudStudioPage({ params }: Props) {
  const { tournamentId } = await params;
  return <HudStudioClient tournamentId={tournamentId} />;
}
