export type SetupStepStatus = "PENDING" | "READY" | "BLOCKED";

export interface EventSetupStep {
  id: string;
  title: string;
  description: string;
  status: SetupStepStatus;
}

export function buildEventSetupChecklist(): EventSetupStep[] {
  return [
    { id: "details", title: "Event details", description: "Name, schedule and public event information.", status: "PENDING" },
    { id: "bracket", title: "Bracket", description: "Create or import the tournament bracket.", status: "PENDING" },
    { id: "stations", title: "Stations", description: "Create stations and verify their ingest/egress configuration.", status: "PENDING" },
    { id: "operators", title: "Operations team", description: "Invite staff and assign organizer roles.", status: "PENDING" },
    { id: "youtube", title: "YouTube", description: "Authorize the event channel and verify stream settings.", status: "PENDING" },
    { id: "dry-run", title: "Dry run", description: "Run one short test match before going live.", status: "PENDING" },
    { id: "publish", title: "Publish event", description: "Open the public event hub for spectators.", status: "PENDING" },
  ];
}
