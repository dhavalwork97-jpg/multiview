import type { ReactNode } from "react";
import BroadcastOperationsPanel from "./BroadcastOperationsPanel";

type Props = {
  children: ReactNode;
  params: Promise<{ tournamentId: string }>;
};

export default async function ControlRoomLayout({ children, params }: Props) {
  const { tournamentId } = await params;

  return (
    <>
      <BroadcastOperationsPanel tournamentId={tournamentId} />
      {children}
    </>
  );
}
