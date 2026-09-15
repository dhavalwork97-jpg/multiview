import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
const OAUTH_STATE_COOKIE = "fgc_youtube_oauth_state";

export type YouTubeConnection = {
  connected: true;
  channelId?: string;
  channelName?: string;
  connectedAt: string;
  encryptedRefreshToken: string;
};

type OAuthState = {
  tournamentId: string;
  clerkUserId: string;
  exp: number;
};

type Overlay = Record<string, unknown> & {
  youtubeConnection?: YouTubeConnection;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function keyMaterial() {
  return createHmac("sha256", requiredEnv("BROADCAST_ENCRYPTION_KEY"))
    .update("fgc-stream-youtube-refresh-token")
    .digest();
}

function stateSecret() {
  return process.env.BROADCAST_OAUTH_STATE_SECRET || requiredEnv("BROADCAST_ENCRYPTION_KEY");
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function youtubeOAuthCookieName() {
  return OAUTH_STATE_COOKIE;
}

export function createYouTubeOAuthState(input: Omit<OAuthState, "exp">) {
  const payload = encode(JSON.stringify({ ...input, exp: Math.floor(Date.now() / 1000) + OAUTH_STATE_MAX_AGE_SECONDS }));
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyYouTubeOAuthState(value: string): OAuthState {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) throw new Error("Invalid YouTube OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid YouTube OAuth state signature");
  const parsed = JSON.parse(decode(payload)) as OAuthState;
  if (!parsed.tournamentId || !parsed.clerkUserId || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) throw new Error("Expired YouTube OAuth state");
  return parsed;
}

export function encryptRefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptRefreshToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted YouTube token");
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function youtubeRedirectUri() {
  return `${requiredEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "")}/api/broadcast/youtube/callback`;
}

export function youtubeAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requiredEnv("YOUTUBE_CLIENT_ID"),
    redirect_uri: youtubeRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/youtube",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("YOUTUBE_CLIENT_ID"),
      client_secret: requiredEnv("YOUTUBE_CLIENT_SECRET"),
      redirect_uri: youtubeRedirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.refresh_token) throw new Error(`YouTube OAuth exchange failed (${response.status})`);
  return data as { refresh_token: string; access_token?: string };
}

async function youtubeChannel(accessToken: string) {
  const response = await fetch(`${YOUTUBE_API}/channels?part=snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Could not read YouTube channel (${response.status})`);
  const channel = data.items?.[0];
  return { channelId: channel?.id as string | undefined, channelName: channel?.snippet?.title as string | undefined };
}

export async function connectYouTube(tournamentId: string, code: string) {
  const tokens = await exchangeCode(code);
  const channel = tokens.access_token ? await youtubeChannel(tokens.access_token) : {};
  const state = await db.broadcastState.findUnique({ where: { tournamentId }, select: { overlay: true } });
  const previous = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as Overlay : {};
  const connection: YouTubeConnection = {
    connected: true,
    channelId: channel.channelId,
    channelName: channel.channelName,
    connectedAt: new Date().toISOString(),
    encryptedRefreshToken: encryptRefreshToken(tokens.refresh_token),
  };
  const overlay = { ...previous, youtubeConnection: connection };
  await db.broadcastState.upsert({
    where: { tournamentId },
    create: { tournamentId, scene: "OFFLINE", overlay: JSON.parse(JSON.stringify(overlay)) },
    update: { overlay: JSON.parse(JSON.stringify(overlay)) },
  });
  return { channelId: channel.channelId, channelName: channel.channelName };
}

export async function getYouTubeConnection(tournamentId: string) {
  const state = await db.broadcastState.findUnique({ where: { tournamentId }, select: { overlay: true } });
  const overlay = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as Overlay : {};
  const connection = overlay.youtubeConnection;
  if (!connection?.connected || !connection.encryptedRefreshToken) return null;
  return { connected: true as const, channelId: connection.channelId, channelName: connection.channelName, connectedAt: connection.connectedAt };
}

export async function getYouTubeAccessToken(tournamentId: string) {
  const state = await db.broadcastState.findUnique({ where: { tournamentId }, select: { overlay: true } });
  const overlay = state?.overlay && typeof state.overlay === "object" && !Array.isArray(state.overlay) ? state.overlay as Overlay : {};
  const connection = overlay.youtubeConnection;
  if (!connection?.encryptedRefreshToken) throw new Error("YouTube is not connected for this tournament");
  const refreshToken = decryptRefreshToken(connection.encryptedRefreshToken);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: requiredEnv("YOUTUBE_CLIENT_ID"), client_secret: requiredEnv("YOUTUBE_CLIENT_SECRET"), refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`YouTube token refresh failed (${response.status})`);
  return data.access_token as string;
}
