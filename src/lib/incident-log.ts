export type IncidentSeverity = "INFO" | "WARNING" | "CRITICAL";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface IncidentRecord {
  id: string;
  tournamentId: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  details?: string;
  createdAt: string;
  resolvedAt?: string;
  createdBy?: string;
}

export function incidentTitle(severity: IncidentSeverity, title: string) {
  return `[${severity}] ${title}`;
}
