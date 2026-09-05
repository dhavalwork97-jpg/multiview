export const CHAT_EMOTES = [
  { token: ":gg:", label: "GG" },
  { token: ":wp:", label: "WP" },
  { token: ":hype:", label: "Hype" },
  { token: ":lol:", label: "LOL" },
  { token: ":clutch:", label: "Clutch" },
  { token: ":ez:", label: "EZ" },
] as const;

const emoteTokens = new Set<string>(CHAT_EMOTES.map((emote) => emote.token));

export function sanitizeChatMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!normalized || normalized.length > 500) return null;
  return normalized;
}

export function extractEmotes(body: string) {
  return Array.from(new Set(body.match(/:[a-z]+:/gi)?.filter((token) => emoteTokens.has(token.toLowerCase())) ?? []));
}

export function isModerator(role: string | null | undefined) {
  return role === "ADMIN" || role === "OWNER" || role === "OPERATOR";
}
