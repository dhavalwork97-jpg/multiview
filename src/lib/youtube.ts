import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";

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
  contentDetails?: {
    boundStreamId?: string;
    enableEmbed?: boolean;
  };
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
  const created = await youtubeRequest<YouTubeStream>("/liveStreams?part=snippet,cdn,contentDetails", {
    method: "POST",
    body: JSON.stringify({
      snippet: { title },
      cdn: { format: "1080p", ingestionType: "rtmp", resolution: "variable", frameRate: "variable" },
      contentDetails: { isReusable: true },
    }),
  });
  if (!created?.id) throw new Error("YouTube returned no live stream id");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stream = await getStream(created.id);
    if (stream?.cdn?.ingestionInfo?.ingestionAddress && stream.cdn.ingestionInfo.streamName) return stream;
    if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`YouTube created live stream ${created.id} but did not return a usable stream key after provisioning`);
}

/**
 * The RTMP key is station-scoped and reusable. It must NEVER be treated as a
 * YouTube broadcast/video id. Every match gets a fresh broadcast, while the
 * physical station can keep using the same key.
 *
 * Before returning a cached key we verify the YouTube resource still exists
 * and return the exact ingestion credentials currently stored by YouTube.
 * This repairs stale DB keys when a stream was deleted/recreated in YouTube.
 */
export async function ensureStationStream(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) throw new Error("Station not found");

  if (station.youtubeStreamId) {
    const existing = await getStream(station.youtubeStreamId);
    const info = existing?.cdn?.ingestionInfo;
    if (existing?.id && info?.ingestionAddress && info.streamName) {
      if (station.ingestUrl !== info.ingestionAddress || station.streamKey !== info.streamName || station.youtubeIngestUrl !== info.ingestionAddress) {
        await db.station.update({ where: { id: stationId }, data: { youtubeIngestUrl: info.ingestionAddress, ingestUrl: info.ingestionAddress, streamKey: info.streamName, ingressId: existing.id } });
      }
      return { streamId: existing.id, ingestUrl: info.ingestionAddress, streamKey: info.streamName };
    }
  }

  const stream = await createReusableStream(`FGC Stream — ${station.label}`);
  const info = stream.cdn?.ingestionInfo;
  if (!info?.ingestionAddress || !info.streamName) throw new Error("YouTube created the stream but did not provide RTMP credentials");
  await db.station.update({
    where: { id: stationId },
    data: { youtubeStreamId: stream.id, youtubeIngestUrl: info.ingestionAddress, ingestUrl: info.ingestionAddress, streamKey: info.streamName, ingressId: stream.id },
  });
  return { streamId: stream.id, ingestUrl: info.ingestionAddress, streamKey: info.streamName };
}

async function getBroadcast(broadcastId: string) {
  try {
    const data = await youtubeRequest<{ items: YouTubeBroadcast[] }>(`/liveBroadcasts?part=status,contentDetails,snippet&id=${encodeURIComponent(broadcastId)}`);
    return data.items?.[0] ?? null;
  } catch (error) {
    if (String(error).includes("YouTube API 404")) return null;
    throw error;
  }
}

async function deleteBroadcast(broadcastId: string) {
  await youtubeRequest(`/liveBroadcasts?id=${encodeURIComponent(broadcastId)}`, { method: "DELETE" });
}

async function completeBroadcast(broadcastId: string) {
  await youtubeRequest(`/liveBroadcasts/transition?id=${encodeURIComponent(broadcastId)}&part=id,status&broadcastStatus=complete`, { method: "POST", body: JSON.stringify({}) });
}

async function retireConflictingBroadcast(streamId: string, currentMatchId: string) {
  const active = await youtubeRequest<{ items: YouTubeBroadcast[] }>(`/liveBroadcasts?part=status,contentDetails,snippet&broadcastStatus=active&maxResults=50`);
  const mine = await youtubeRequest<{ items: YouTubeBroadcast[] }>(`/liveBroadcasts?part=status,contentDetails,snippet&mine=true&broadcastType=all&maxResults=50`);
  const candidates = [...(active.items ?? []), ...(mine.items ?? [])]
    .filter((b, i, all) => all.findIndex((x) => x.id === b.id) === i)
    .filter((b) => b.contentDetails?.boundStreamId === streamId && b.status?.lifeCycleStatus !== "complete");

  for (const candidate of candidates) {
    const owner = await db.match.findFirst({ where: { youtubeBroadcastId: candidate.id }, select: { id: true, status: true } });
    if (owner?.id === currentMatchId) return candidate;
    if (owner?.status === "LIVE" || candidate.status?.lifeCycleStatus === "live") {
      // Never silently kill another live match. The operator must end it first.
      throw new Error(`Station is still using YouTube broadcast ${candidate.id}. End the current match before starting another one.`);
    }
    await deleteBroadcast(candidate.id);
  }
  return null;
}

export async function createBroadcastForMatch(matchId: string) {
  const match = await db.match.findUnique({ where: { id: matchId }, include: { station: true, tournament: true, playerOne: true, playerTwo: true } });
  if (!match?.station) throw new Error("Match must be assigned to a station before going LIVE");

  const stream = await ensureStationStream(match.station.id);

  // Idempotency: retries of the same Start action reuse the same broadcast,
  // but NEVER reuse a broadcast that YouTube marked as non-embeddable.
  //
  // A YouTube broadcast with enableEmbed=false produces the exact
  // "Playback on other websites has been disabled by the video owner" page
  // seen in FGC Stream. YouTube does not allow enableEmbed to be changed once
  // a broadcast reaches testing/live, so a bad live broadcast must not be
  // silently reused.
  if (match.youtubeBroadcastId) {
    const existing = await getBroadcast(match.youtubeBroadcastId);

    if (existing?.contentDetails?.boundStreamId === stream.streamId &&
        existing.status?.lifeCycleStatus !== "complete") {
      if (existing.contentDetails?.enableEmbed !== false) {
        return { broadcastId: existing.id, videoId: existing.id, station: match.station };
      }

      const lifecycle = existing.status?.lifeCycleStatus;
      if (lifecycle === "live" || lifecycle === "liveStarting" || lifecycle === "testing" || lifecycle === "testStarting") {
        throw new Error(
          `YouTube broadcast ${existing.id} is not embeddable (enableEmbed=false) and is already ${lifecycle}. ` +
          "YouTube does not allow changing embed permission after testing/live starts. End this broadcast and start the match again."
        );
      }

      // created/ready broadcasts can safely be replaced before they go live.
      await deleteBroadcast(existing.id);
    }
  }

  await retireConflictingBroadcast(stream.streamId, matchId);

  const scheduledStartTime = new Date(Date.now() + 15_000).toISOString();
  const title = `${match.tournament.name} — ${match.playerOne.gamertag} vs ${match.playerTwo.gamertag}`;
  const broadcast = await youtubeRequest<YouTubeBroadcast>("/liveBroadcasts?part=snippet,status,contentDetails", {
    method: "POST",
    body: JSON.stringify({
      snippet: { title, description: `${match.tournament.name} · ${match.station.label}${match.round ? ` · ${match.round}` : ""}`, scheduledStartTime },
      status: { privacyStatus: "unlisted" },
      contentDetails: { enableAutoStart: true, enableAutoStop: true, enableDvr: true, recordFromStart: true, enableEmbed: true },
    }),
  });
  if (!broadcast?.id) throw new Error("YouTube returned no broadcast id");

  try {
    await youtubeRequest(`/liveBroadcasts/bind?id=${encodeURIComponent(broadcast.id)}&part=id,contentDetails&streamId=${encodeURIComponent(stream.streamId)}`, { method: "POST", body: JSON.stringify({}) });
    const bound = await getBroadcast(broadcast.id);
    if (bound?.contentDetails?.boundStreamId !== stream.streamId) throw new Error("YouTube created the broadcast but did not bind it to this station's stream");
  } catch (error) {
    try { await deleteBroadcast(broadcast.id); } catch (cleanupError) { console.error("[youtube] failed to clean up orphan broadcast", cleanupError); }
    throw new Error(`YouTube broadcast was created but could not be bound to the station: ${error instanceof Error ? error.message : String(error)}`);
  }

  const updatedMatch = await db.match.update({ where: { id: matchId }, data: { youtubeBroadcastId: broadcast.id, youtubeVideoId: broadcast.id } });
  await db.station.update({ where: { id: match.station.id }, data: { youtubeBroadcastId: broadcast.id, youtubeVideoId: broadcast.id, youtubeLiveStatus: "created", youtubeLastStatusAt: new Date() } });
  return { broadcastId: broadcast.id, videoId: broadcast.id, station: updatedMatch };
}

export async function transitionBroadcastLive(broadcastId: string) {
  return youtubeRequest<{ items: YouTubeBroadcast[] }>(`/liveBroadcasts/transition?id=${encodeURIComponent(broadcastId)}&part=id,status&broadcastStatus=live`, { method: "POST", body: JSON.stringify({}) });
}

export async function endBroadcastForMatch(matchId: string) {
  const match = await db.match.findUnique({ where: { id: matchId }, select: { youtubeBroadcastId: true } });
  if (!match?.youtubeBroadcastId) return;
  const broadcast = await getBroadcast(match.youtubeBroadcastId);
  if (!broadcast || broadcast.status?.lifeCycleStatus === "complete" || broadcast.status?.lifeCycleStatus === "revoked") return;
  if (broadcast.status?.lifeCycleStatus === "live") await completeBroadcast(broadcast.id);
  else await deleteBroadcast(broadcast.id);
}

export async function getStreamAndBroadcastStatus(stationId: string) {
  const station = await db.station.findUnique({
    where: { id: stationId },
    include: { matches: { where: { status: { in: ["QUEUED", "LIVE"] } }, orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, status: true, youtubeBroadcastId: true, youtubeVideoId: true } } },
  });
  if (!station) throw new Error("Station not found");
  if (!station.youtubeStreamId) return { streamStatus: "inactive", broadcastStatus: null, videoId: station.youtubeVideoId, healthStatus: null, configurationIssues: [] };

  const stream = await getStream(station.youtubeStreamId, true);
  if (!stream) return { streamStatus: "inactive", broadcastStatus: "complete", videoId: null, healthStatus: null, configurationIssues: [] };
  const streamStatus = stream.status?.streamStatus ?? "inactive";
  const healthStatus = stream.status?.healthStatus?.status ?? null;
  const configurationIssues = stream.status?.healthStatus?.configurationIssues ?? [];
  const currentMatch = station.matches[0];
  let broadcast: YouTubeBroadcast | undefined;

  if (currentMatch?.youtubeBroadcastId) {
    const candidate = await getBroadcast(currentMatch.youtubeBroadcastId);
    if (candidate?.contentDetails?.boundStreamId === station.youtubeStreamId &&
        candidate.contentDetails?.enableEmbed !== false) {
      broadcast = candidate;
    }
  }

  // Recovery path: never use broadcastStatus + mine in one request. Find a
  // broadcast bound to this station stream, but only accept broadcasts that
  // are actually embeddable by FGC Stream.
  if (!broadcast) {
    const active = await youtubeRequest<{ items: YouTubeBroadcast[] }>(`/liveBroadcasts?part=status,contentDetails,snippet&broadcastStatus=active&maxResults=50`);
    broadcast = active.items?.find(
      (candidate) =>
        candidate.contentDetails?.boundStreamId === station.youtubeStreamId &&
        candidate.contentDetails?.enableEmbed !== false
    );

    if (!broadcast) {
      const mine = await youtubeRequest<{ items: YouTubeBroadcast[] }>(`/liveBroadcasts?part=status,contentDetails,snippet&mine=true&broadcastType=all&maxResults=50`);
      broadcast = (mine.items ?? [])
        .filter((candidate) => candidate.contentDetails?.boundStreamId === station.youtubeStreamId)
        .filter((candidate) => candidate.contentDetails?.enableEmbed !== false)
        .filter((candidate) => candidate.status?.lifeCycleStatus !== "complete")
        .sort((a, b) => (Date.parse(b.snippet?.scheduledStartTime ?? "") || 0) - (Date.parse(a.snippet?.scheduledStartTime ?? "") || 0))[0];
    }

    if (broadcast?.id && currentMatch) {
      await db.match.update({ where: { id: currentMatch.id }, data: { youtubeBroadcastId: broadcast.id, youtubeVideoId: broadcast.id } });
    }
  }

  const broadcastStatus = broadcast?.status?.lifeCycleStatus ?? null;
  const videoId = broadcast?.id ?? currentMatch?.youtubeVideoId ?? station.youtubeVideoId;
  if (broadcast?.id && streamStatus === "active" && (broadcastStatus === "ready" || broadcastStatus === "testing")) {
    try {
      const transitioned = await transitionBroadcastLive(broadcast.id);
      return { streamStatus, broadcastStatus: transitioned.items?.[0]?.status?.lifeCycleStatus ?? "live", videoId, healthStatus, configurationIssues };
    } catch (error) {
      console.warn("[youtube] broadcast transition not available yet", error);
    }
  }
  return { streamStatus, broadcastStatus, videoId, healthStatus, configurationIssues };
}

export async function syncStationYoutubeStatus(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId }, include: { matches: { where: { status: { in: ["QUEUED", "LIVE"] } }, orderBy: { updatedAt: "desc" }, take: 1 } } });
  if (!station) throw new Error("Station not found");
  const state = await getStreamAndBroadcastStatus(stationId);
  const isLive = state.streamStatus === "active" && state.broadcastStatus === "live";
  const broadcastEnded = state.broadcastStatus === "complete" || state.broadcastStatus === "revoked";
  const feedHasIssue = state.healthStatus === "bad";
  const now = new Date();
  const stationStatus = feedHasIssue ? "ERROR" : isLive ? "LIVE" : state.streamStatus === "active" ? "IDLE" : "OFFLINE";

  const updated = await db.station.update({ where: { id: stationId }, data: { status: stationStatus, lastHeartbeatAt: now, youtubeLiveStatus: state.broadcastStatus ?? state.streamStatus, youtubeVideoId: state.videoId, youtubeLastStatusAt: now, youtubeBroadcastId: station.matches[0]?.youtubeBroadcastId ?? undefined } });
  const match = station.matches[0];

  // Do not demote an operator-started match back to QUEUED just because
  // YouTube needs a few seconds to move READY/TESTING -> LIVE. Once the
  // broadcast is prepared, the match remains LIVE until it ends.
  if (match && isLive && match.status !== "LIVE") {
    await db.match.update({ where: { id: match.id }, data: { status: "LIVE", startedAt: match.startedAt ?? now } });
    await publishEvent({ type: "match:updated", tournamentId: station.tournamentId, matchId: match.id, status: "LIVE", playerOneScore: match.playerOneScore, playerTwoScore: match.playerTwoScore, winnerId: null, stationId: station.id });
  }
  if (match && broadcastEnded && match.status === "LIVE") {
    await db.match.update({ where: { id: match.id }, data: { status: "COMPLETED", endedAt: match.endedAt ?? now } });
    await publishEvent({ type: "match:updated", tournamentId: station.tournamentId, matchId: match.id, status: "COMPLETED", playerOneScore: match.playerOneScore, playerTwoScore: match.playerTwoScore, winnerId: null, stationId: station.id });
  }
  await publishEvent({ type: "station:status", tournamentId: station.tournamentId, stationId: station.id, status: stationStatus, lastHeartbeatAt: now.toISOString() });
  return { station: updated, ...state, isLive };
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
