export type RundownStatus = "PENDING" | "LIVE" | "COMPLETED" | "SKIPPED";
export type RundownAction = "TAKE" | "COMPLETE" | "SKIP" | "MOVE_UP" | "MOVE_DOWN";

export function canTransition(status: RundownStatus, action: RundownAction): boolean {
  switch (action) {
    case "TAKE": return status === "PENDING";
    case "COMPLETE": return status === "LIVE";
    case "SKIP": return status === "PENDING";
    case "MOVE_UP":
    case "MOVE_DOWN": return status !== "LIVE";
  }
}

export function canEdit(status: RundownStatus): boolean {
  return status !== "LIVE";
}

export function canDelete(status: RundownStatus): boolean {
  return status !== "LIVE";
}

export function canReorder(status: RundownStatus): boolean {
  return status !== "LIVE";
}

export function isValidMatchReference(cueType: string, matchId?: string | null): boolean {
  if (cueType === "MATCH") return Boolean(matchId);
  return !matchId;
}

export function movedOrder<T extends { id: string }>(
  items: readonly T[],
  id: string,
  action: "MOVE_UP" | "MOVE_DOWN",
): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return [...items];
  const target = action === "MOVE_UP" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return [...items];
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
