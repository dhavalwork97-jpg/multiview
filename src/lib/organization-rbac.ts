export type OrganizerRole = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";

const ROLE_RANK: Record<OrganizerRole, number> = {
  VIEWER: 10,
  OPERATOR: 20,
  ADMIN: 30,
  OWNER: 40,
};

export function canManageEvent(role: OrganizerRole | null | undefined) {
  return !!role && ROLE_RANK[role] >= ROLE_RANK.OPERATOR;
}

export function canManageTeam(role: OrganizerRole | null | undefined) {
  return !!role && ROLE_RANK[role] >= ROLE_RANK.ADMIN;
}

export function canManageBilling(role: OrganizerRole | null | undefined) {
  return role === "OWNER";
}

export function canViewEvent(role: OrganizerRole | null | undefined) {
  return !!role;
}

export function hasRole(
  role: OrganizerRole | null | undefined,
  required: OrganizerRole,
) {
  return !!role && ROLE_RANK[role] >= ROLE_RANK[required];
}

export const ORGANIZER_ROLES: OrganizerRole[] = [
  "OWNER",
  "ADMIN",
  "OPERATOR",
  "VIEWER",
];
