export const REACTIONS = ["🔥", "👏", "😱", "⚡", "💜"] as const;
export type Reaction = (typeof REACTIONS)[number];
