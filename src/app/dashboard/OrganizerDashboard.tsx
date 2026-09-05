import { OrganizerControlCenter } from "@/components/dashboard/OrganizerControlCenter";

export function OrganizerDashboard({ role, tournamentCount }: { role: Parameters<typeof OrganizerControlCenter>[0]["role"]; tournamentCount: number }) {
  return <OrganizerControlCenter role={role} tournamentCount={tournamentCount} />;
}
