import HudOutputClient from "./HudOutputClient";

type HudOutputPageProps = {
  params: Promise<{ tournamentId: string; packageId: string }>;
};

export default async function HudOutputPage({ params }: HudOutputPageProps) {
  const { tournamentId, packageId } = await params;
  return <HudOutputClient tournamentId={tournamentId} packageId={packageId} />;
}
