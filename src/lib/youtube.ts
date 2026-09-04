import { db } from "@/lib/db";
import { isYouTubeQuotaError, markYouTubeQuotaBlocked, reserveYouTubeQuota, YOUTUBE_QUOTA_UNITS } from "@/lib/youtube-quota";

type YouTubeStream = {
  id: string;
  cdn?: { ingestionInfo?: { ingestionAddress?: string; streamName?: string } };
  status?: {
    streamStatus?: string;
    healthStatus?: {
      status?: string;
      configurationIssues?: Array<{ type?: string; severity?: string; description?: string }>;
    };
  };
};

type YouTubeBroadcast = {
  id: string;
  snippet?: { title?: string; scheduledStartTime?: string };
  status?: { lifeCycleStatus?: string; privacyStatus?: string };
  contentDetails?: { boundStreamId?: string };
};

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

async function accessToken(): Promise<string> {
  const refreshToken = env("YOUTUBE_REFRESH_TOKEN");
  const clientId = env("YOUTUBE_CLIENT_ID");
  const clientSecret = env("YOUTUBE_CLIENT_SECRET");
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`YouTube OAuth refresh failed (${res.status}): ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function youtubeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${YOUTUBE_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${JSON.stringify(data)}`);
  return data as T;
}

async function youtubeWrite<T>(path: string, init: RequestInit, quotaUnits: number, operation: string): Promise<T> {
  await reserveYouTubeQuota(quotaUnits, operation);
  try {
    return await youtubeRequest<T>(path, init);
  } catch (error) {
    if (isYouTubeQuotaError(error)) {
      await markYouTubeQuotaBlocked();
    }
    throw error;
  }
}

export function youtubeConfigured() {
  return !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN);
}

async function getStream(streamId: string, includeStatus = false) {
  const part = includeStatus ? "snippet,cdn,contentDetails,status" : "snippet,cdn,contentDetails";
  try {
    const data = await youtubeRequest<{ items: YouTubeStream[] }>(`/liveStreams?part=${part}&id=${encodeURIComponent(streamId)}`);
    return data.items?.[0] ?? null;
  } catch (error) {
    const message = String(error);
    if (message.includes("YouTube API 404")) return null;
    throw error;
  }
}

export async function createReusableStream(title: string) {
  const created = await youtubeWrite<YouTubeStream>("/liveStreams?part=snippet,cdn,contentDetails", {
    method: "POST",
    body: JSON.stringify({
      snippet: { title },
      cdn: { format: "1080p", ingestionType: "rtmp", resolution: "variable", frameRate: "variable" },
      contentDetails: { isReusable: true },
    }),
  }, YOUTUBE_QUOTA_UNITS.LIVE_STREAM_INSERT, "liveStreams.insert");
  if (!created?.id) throw new Error("YouTube returned no live stream id");
  if (created.cdn?.ingestionInfo?.ingestionAddress && created.cdn.ingestionInfo.streamName) return created;
  const recovered = await getStream(created.id);
  if (recovered?.cdn?.ingestionInfo?.ingestionAddress && recovered.cdn.ingestionInfo.streamName) return recovered;
  throw new Error(`YouTube created live stream ${created.id} but did not return usable RTMP credentials`);
}

export async function ensureStationStream(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) throw new Error("Station not found");
  if (station.youtubeStreamId && station.youtubeIngestUrl && station.streamKey) {
    return { streamId: station.youtubeStreamId, ingestUrl: station.youtubeIngestUrl, streamKey: station.streamKey };
  }
  const leaseCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const claimed = await db.station.updateMany({
    where: { id: stationId, OR: [{ youtubeStreamProvisioningAt: null }, { youtubeStreamProvisioningAt: { lt: leaseCutoff } }] },
    data: { youtubeStreamProvisioningAt: new Date() },
  });
  if (claimed.count !== 1) {
    const current = await db.station.findUnique({ where: { id: stationId }, select: { youtubeStreamId: true, youtubeIngestUrl: true, streamKey: true } });
    if (current?.youtubeStreamId && current.youtubeIngestUrl && current.streamKey) return { streamId: current.youtubeStreamId, ingestUrl: current.youtubeIngestUrl, streamKey: current.streamKey };
    throw new Error(`Station ${station.label} is already preparing a YouTube stream. Wait a few seconds and try again.`);
  }
  try {
    const stream = await createReusableStream(`FGC Stream — ${station.label}`);
    const info = stream.cdn?.ingestionInfo;
    if (!info?.ingestionAddress || !info.streamName) throw new Error("YouTube created the stream but did not provide RTMP credentials");
    await db.station.update({ where: { id: stationId }, data: { youtubeStreamId: stream.id, youtubeIngestUrl: info.ingestionAddress, ingestUrl: info.ingestionAddress, streamKey: info.streamName, ingressId: stream.id } });
    return { streamId: stream.id, ingestUrl: info.ingestionAddress, streamKey: info.streamName };
  } finally {
    await db.station.updateMany({ where: { id: stationId }, data: { youtubeStreamProvisioningAt: null } });
  }
}

export async function createBroadcastForMatch(matchId: string) {
  const match = await db.match.findUnique({ where: { id: matchId }, include: { station: true, tournament: true, playerOne: true, playerTwo: true } });
  if (!match?.station) throw new Error("Match must be assigned to a station before going LIVE");
  const station = match.station;
  const claimed = await db.station.updateMany({
    where: { id: station.id, OR: [{ youtubeProvisioningAt: null }, { youtubeProvisioningAt: { lt: new Date(Date.now() - 2 * 60 * 1000) } }] },
    data: { youtubeProvisioningAt: new Date() },
  });
  if (claimed.count !== 1) {
    const current = await db.station.findUnique({ where: { id: station.id }, select: { youtubeBroadcastId: true, youtubeVideoId: true, youtubeLiveStatus: true } });
    if (current?.youtubeBroadcastId && current.youtubeVideoId && current.youtubeLiveStatus !== "complete") {
      await db.match.update({ where: { id: matchId }, data: { youtubeBroadcastId: current.youtubeBroadcastId, youtubeVideoId: current.youtubeVideoId, status: "LIVE", startedAt: match.startedAt ?? new Date() } });
      return { broadcastId: current.youtubeBroadcastId, videoId: current.youtubeVideoId, station };
    }
    throw new Error(`Station ${station.label} is already preparing a YouTube broadcast. Wait a few seconds and try again.`);
  }
  try {
    const anotherLiveMatch = await db.match.findFirst({ where: { stationId: station.id, status: "LIVE", id: { not: matchId } }, select: { id: true } });
    if (anotherLiveMatch) throw new Error(`Station ${station.label} is already streaming another match. Complete that match before starting this one.`);
    if (station.youtubeBroadcastId && station.youtubeVideoId && station.youtubeLiveStatus !== "complete") {
      const reusedMatch = await db.match.update({ where: { id: matchId }, data: { youtubeBroadcastId: station.youtubeBroadcastId, youtubeVideoId: station.youtubeVideoId, status: "LIVE", startedAt: match.startedAt ?? new Date() } });
      return { broadcastId: station.youtubeBroadcastId, videoId: station.youtubeVideoId, station: reusedMatch };
    }
    const stream = await ensureStationStream(station.id);
    const scheduledStartTime = new Date(Date.now() + 15_000).toISOString();
    const title = `${match.tournament.name} — ${station.label}`;
    const broadcast = await youtubeWrite<YouTubeBroadcast>("/liveBroadcasts?part=snippet,status,contentDetails", {
      method: "POST",
      body: JSON.stringify({
        snippet: { title, description: `${match.tournament.name} · ${station.label} · FGC Stream`, scheduledStartTime },
        status: { privacyStatus: "unlisted" },
        contentDetails: { enableAutoStart: true, enableAutoStop: false, enableDvr: true, recordFromStart: true },
      }),
    }, YOUTUBE_QUOTA_UNITS.BROADCAST_INSERT, "liveBroadcasts.insert");
    if (!broadcast?.id) throw new Error("YouTube returned no broadcast id");
    try {
      await youtubeWrite(`/liveBroadcasts/bind?id=${encodeURIComponent(broadcast.id)}&part=id,contentDetails&streamId=${encodeURIComponent(stream.streamId)}`, { method: "POST", body: JSON.stringify({}) }, YOUTUBE_QUOTA_UNITS.BROADCAST_BIND, "liveBroadcasts.bind");
    } catch (error) {
      try { await youtubeWrite(`/liveBroadcasts?id=${encodeURIComponent(broadcast.id)}`, { method: "DELETE" }, YOUTUBE_QUOTA_UNITS.BROADCAST_DELETE, "liveBroadcasts.delete"); } catch (cleanupError) { console.error("[youtube] failed to clean up orphan broadcast", cleanupError); }
      throw new Error(`YouTube broadcast was created but could not be bound to the station: ${error instanceof Error ? error.message : String(error)}`);
    }
    const updatedMatch = await db.match.update({ where: { id: matchId }, data: { youtubeBroadcastId: broadcast.id, youtubeVideoId: broadcast.id, status: "LIVE", startedAt: match.startedAt ?? new Date() } });
    const now = new Date();
    await db.station.update({ where: { id: station.id }, data: { youtubeBroadcastId: broadcast.id, youtubeVideoId: broadcast.id, youtubeLiveStatus: "starting", youtubeLastStatusAt: now, status: "LIVE", lastHeartbeatAt: now } });
    return { broadcastId: broadcast.id, videoId: broadcast.id, station: updatedMatch };
  } finally {
    await db.station.updateMany({ where: { id: station.id }, data: { youtubeProvisioningAt: null } });
  }
}

export async function endBroadcastForMatch(_matchId: string) {
  return;
}

export async function verifyStationYoutubeStatus(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId }, select: { youtubeBroadcastId: true, youtubeStreamId: true, youtubeLastStatusAt: true, status: true, youtubeVideoId: true } });
  if (!station) throw new Error("Station not found");
  if (!station.youtubeBroadcastId) return getStationYoutubeStatus(stationId);
  if (station.youtubeLastStatusAt && Date.now() - station.youtubeLastStatusAt.getTime() < 30_000) return getStationYoutubeStatus(stationId);
  const data = await youtubeRequest<{ items: YouTubeBroadcast[] }>(`/liveBroadcasts?part=status,contentDetails&id=${encodeURIComponent(station.youtubeBroadcastId)}`);
  const broadcast = data.items?.[0];
  const lifecycle = broadcast?.status?.lifeCycleStatus ?? "unknown";
  const isLive = lifecycle === "live" || lifecycle === "liveStarting";
  await db.station.update({ where: { id: stationId }, data: { youtubeLiveStatus: lifecycle, youtubeLastStatusAt: new Date(), status: isLive ? "LIVE" : station.status, lastHeartbeatAt: isLive ? new Date() : station.status === "LIVE" ? station.youtubeLastStatusAt : undefined } });
  return getStationYoutubeStatus(stationId);
}

export async function endStationBroadcast(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId }, select: { youtubeBroadcastId: true } });
  if (!station?.youtubeBroadcastId) return { ended: false };
  try {
    await youtubeWrite(`/liveBroadcasts/transition?id=${encodeURIComponent(station.youtubeBroadcastId)}&part=id,status&broadcastStatus=complete`, { method: "POST", body: JSON.stringify({}) }, YOUTUBE_QUOTA_UNITS.BROADCAST_TRANSITION, "liveBroadcasts.transition");
  } catch (error) {
    const message = String(error);
    if (/errorStreamInactive|invalidTransition/i.test(message)) {
      try {
        await youtubeWrite(`/liveBroadcasts?id=${encodeURIComponent(station.youtubeBroadcastId)}`, { method: "DELETE" }, YOUTUBE_QUOTA_UNITS.BROADCAST_DELETE, "liveBroadcasts.delete");
      } catch (deleteError) {
        const deleteMessage = String(deleteError);
        if (!/notFound|liveBroadcastNotFound/i.test(deleteMessage)) throw deleteError;
      }
    } else if (!/redundantTransition|notFound|liveBroadcastNotFound/i.test(message)) {
      throw error;
    }
  }
  await db.station.update({ where: { id: stationId }, data: { youtubeBroadcastId: null, youtubeVideoId: null, youtubeLiveStatus: "complete", youtubeLastStatusAt: new Date(), status: "OFFLINE", lastHeartbeatAt: new Date() } });
  return { ended: true };
}

export async function getStationYoutubeStatus(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId }, select: { id: true, status: true, youtubeVideoId: true, youtubeLiveStatus: true, youtubeLastStatusAt: true } });
  if (!station) throw new Error("Station not found");
  return { station, streamStatus: station.status === "OFFLINE" ? "inactive" : "active", broadcastStatus: station.youtubeLiveStatus, videoId: station.youtubeVideoId, isLive: station.status === "LIVE" && !!station.youtubeVideoId };
}

export async function syncStationYoutubeStatus(stationId: string) {
  return getStationYoutubeStatus(stationId);
}

export function youtubeAuthUrl() {
  const clientId = env("YOUTUBE_CLIENT_ID");
  const redirectUri = `${env("NEXT_PUBLIC_APP_URL").replace(/\/$/, "")}/api/youtube/callback`;
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/youtube" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeYouTubeCode(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env("YOUTUBE_CLIENT_ID"), client_secret: env("YOUTUBE_CLIENT_SECRET"), redirect_uri: `${env("NEXT_PUBLIC_APP_URL").replace(/\/$/, "")}/api/youtube/callback`, grant_type: "authorization_code" }), cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.refresh_token) throw new Error(`YouTube OAuth exchange failed (${res.status}): ${JSON.stringify(data)}`);
  return data as { refresh_token: string; access_token?: string };
}
