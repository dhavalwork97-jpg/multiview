import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events";

type YouTubeStream = {
  id: string;
  cdn?: { ingestionInfo?: { ingestionAddress?: string; streamName?: string } };
  status?: { streamStatus?: string };
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
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`YouTube OAuth refresh failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

async function youtubeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${YOUTUBE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`YouTube API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

export function youtubeConfigured() {
  return !!(
    process.env.YOUTUBE_CLIENT_ID &&
    process.env.YOUTUBE_CLIENT_SECRET &&
    process.env.YOUTUBE_REFRESH_TOKEN
  );
}

export async function createReusableStream(title: string) {
  const data = await youtubeRequest<{ items: YouTubeStream[] }>(
    "/liveStreams?part=snippet,cdn,contentDetails",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: { title },
        cdn: {
          format: "1080p",
          ingestionType: "rtmp",
          resolution: "variable",
          frameRate: "variable",
        },
        contentDetails: { isReusable: true },
      }),
    }
  );

  const stream = data.items?.[0];
  if (!stream?.id || !stream.cdn?.ingestionInfo?.ingestionAddress || !stream.cdn.ingestionInfo.streamName) {
    throw new Error("YouTube returned an incomplete live stream resource");
  }
  return stream;
}

export async function ensureStationStream(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) throw new Error("Station not found");

  if (station.youtubeStreamId && station.ingestUrl && station.streamKey) {
    return {
      streamId: station.youtubeStreamId,
      ingestUrl: station.ingestUrl,
      streamKey: station.streamKey,
    };
  }

  const stream = await createReusableStream(`FGC Stream — ${station.label}`);
  const ingestUrl = stream.cdn!.ingestionInfo!.ingestionAddress!;
  const streamKey = stream.cdn!.ingestionInfo!.streamName!;

  await db.station.update({
    where: { id: stationId },
    data: {
      youtubeStreamId: stream.id,
      youtubeIngestUrl: ingestUrl,
      ingestUrl,
      streamKey,
      // Keep these populated for older UI/read paths while the migration is
      // rolled out. playbackIdWebrtc is deliberately no longer used for playback.
      ingressId: stream.id,
    },
  });

  return { streamId: stream.id, ingestUrl, streamKey };
}

export async function createBroadcastForMatch(matchId: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { station: true, tournament: true, playerOne: true, playerTwo: true },
  });
  if (!match?.station) throw new Error("Match must be assigned to a station before going LIVE");

  const stream = await ensureStationStream(match.station.id);
  const scheduledStartTime = new Date(Date.now() + 60_000).toISOString();
  const title = `${match.tournament.name} — ${match.playerOne.gamertag} vs ${match.playerTwo.gamertag}`;

  const data = await youtubeRequest<{ items: YouTubeBroadcast[] }>(
    "/liveBroadcasts?part=snippet,status,contentDetails",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          title,
          description: `${match.tournament.name} · ${match.station.label}${match.round ? ` · ${match.round}` : ""}`,
          scheduledStartTime,
        },
        status: { privacyStatus: "unlisted" },
        contentDetails: {
          enableAutoStart: true,
          enableAutoStop: true,
          enableDvr: true,
          recordFromStart: true,
          enableEmbed: true,
        },
      }),
    }
  );

  const broadcast = data.items?.[0];
  if (!broadcast?.id) throw new Error("YouTube returned no broadcast id");

  await youtubeRequest(
    `/liveBroadcasts/bind?id=${encodeURIComponent(broadcast.id)}&part=id,contentDetails&streamId=${encodeURIComponent(stream.streamId)}`,
    { method: "POST", body: JSON.stringify({}) }
  );

  const updated = await db.station.update({
    where: { id: match.station.id },
    data: {
      youtubeBroadcastId: broadcast.id,
      youtubeVideoId: broadcast.id,
      youtubeLiveStatus: "created",
      youtubeLastStatusAt: new Date(),
    },
  });

  return { broadcastId: broadcast.id, videoId: broadcast.id, station: updated };
}

export async function transitionBroadcastLive(broadcastId: string) {
  return youtubeRequest<{ items: YouTubeBroadcast[] }>(
    `/liveBroadcasts/transition?id=${encodeURIComponent(broadcastId)}&part=id,status&broadcastStatus=live`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function getStreamAndBroadcastStatus(stationId: string) {
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) throw new Error("Station not found");
  if (!station.youtubeStreamId) {
    return { streamStatus: "inactive", broadcastStatus: null, videoId: station.youtubeVideoId };
  }

  const streamData = await youtubeRequest<{ items: YouTubeStream[] }>(
    `/liveStreams?part=status&id=${encodeURIComponent(station.youtubeStreamId)}`
  );
  const streamStatus = streamData.items?.[0]?.status?.streamStatus ?? "inactive";

  let broadcastStatus: string | null = null;
  let videoId = station.youtubeVideoId;
  if (station.youtubeBroadcastId) {
    const broadcastData = await youtubeRequest<{ items: YouTubeBroadcast[] }>(
      `/liveBroadcasts?part=status,contentDetails&id=${encodeURIComponent(station.youtubeBroadcastId)}`
    );
    const broadcast = broadcastData.items?.[0];
    broadcastStatus = broadcast?.status?.lifeCycleStatus ?? null;
    videoId = broadcast?.id ?? videoId;
  }

  return { streamStatus, broadcastStatus, videoId };
}

export async function syncStationYoutubeStatus(stationId: string) {
  const station = await db.station.findUnique({
    where: { id: stationId },
    include: { matches: { where: { status: { in: ["QUEUED", "LIVE"] } }, orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  if (!station) throw new Error("Station not found");

  const state = await getStreamAndBroadcastStatus(stationId);
  const isLive = state.streamStatus === "active" && state.broadcastStatus === "live";
  const broadcastEnded = state.broadcastStatus === "complete";
  const now = new Date();

  let stationStatus: "OFFLINE" | "IDLE" | "LIVE" | "ERROR" = isLive ? "LIVE" : "OFFLINE";
  if (state.streamStatus === "active" && state.broadcastStatus && !isLive && !broadcastEnded) {
    stationStatus = "IDLE";
  }

  const updated = await db.station.update({
    where: { id: stationId },
    data: {
      status: stationStatus,
      lastHeartbeatAt: now,
      youtubeLiveStatus: state.broadcastStatus ?? state.streamStatus,
      youtubeVideoId: state.videoId,
      youtubeLastStatusAt: now,
    },
  });

  const match = station.matches[0];
  if (match && !isLive && !broadcastEnded && match.status === "LIVE") {
    // Match state follows the actual YouTube media state. If an organizer
    // marked a match LIVE before OBS connected, keep it queued until YouTube
    // confirms that the broadcast is really live.
    await db.match.update({ where: { id: match.id }, data: { status: "QUEUED", startedAt: null } });
    await publishEvent({
      type: "match:updated",
      tournamentId: station.tournamentId,
      matchId: match.id,
      status: "QUEUED",
      playerOneScore: match.playerOneScore,
      playerTwoScore: match.playerTwoScore,
      winnerId: null,
      stationId: station.id,
    });
  }

  if (match && isLive && match.status !== "LIVE") {
    await db.match.update({ where: { id: match.id }, data: { status: "LIVE", startedAt: match.startedAt ?? now } });
    await publishEvent({
      type: "match:updated",
      tournamentId: station.tournamentId,
      matchId: match.id,
      status: "LIVE",
      playerOneScore: match.playerOneScore,
      playerTwoScore: match.playerTwoScore,
      winnerId: null,
      stationId: station.id,
    });
  }

  if (match && broadcastEnded && match.status === "LIVE") {
    await db.match.update({ where: { id: match.id }, data: { status: "COMPLETED", endedAt: match.endedAt ?? now } });
    await publishEvent({
      type: "match:updated",
      tournamentId: station.tournamentId,
      matchId: match.id,
      status: "COMPLETED",
      playerOneScore: match.playerOneScore,
      playerTwoScore: match.playerTwoScore,
      winnerId: null,
      stationId: station.id,
    });
  }

  await publishEvent({
    type: "station:status",
    tournamentId: station.tournamentId,
    stationId: station.id,
    status: stationStatus,
    lastHeartbeatAt: now.toISOString(),
  });

  return { station: updated, ...state, isLive };
}

export function youtubeAuthUrl() {
  const clientId = env("YOUTUBE_CLIENT_ID");
  const redirectUri = `${env("NEXT_PUBLIC_APP_URL").replace(/\/$/, "")}/api/youtube/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/youtube",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeYouTubeCode(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("YOUTUBE_CLIENT_ID"),
      client_secret: env("YOUTUBE_CLIENT_SECRET"),
      redirect_uri: `${env("NEXT_PUBLIC_APP_URL").replace(/\/$/, "")}/api/youtube/callback`,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.refresh_token) {
    throw new Error(`YouTube OAuth exchange failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data as { refresh_token: string; access_token?: string };
}
