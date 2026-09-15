import { db } from "@/lib/db";
import { getYouTubeAccessToken } from "@/lib/broadcast/youtube-connection";
import { decryptBroadcastSecret, encryptBroadcastSecret } from "@/lib/broadcast/managed-kms";
import { isYouTubeQuotaError, markYouTubeQuotaBlocked, reserveYouTubeQuota, YOUTUBE_QUOTA_UNITS } from "@/lib/youtube-quota";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

type YouTubeStream = { id?: string; cdn?: { ingestionInfo?: { ingestionAddress?: string; streamName?: string } } };
type YouTubeBroadcast = { id?: string; status?: { lifeCycleStatus?: string } };

async function youtubeRequest<T>(tournamentId: string, oidcToken: string | undefined, path: string, init: RequestInit = {}) {
  const accessToken = await getYouTubeAccessToken(tournamentId, oidcToken);
  const response = await fetch(`${YOUTUBE_API}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init.headers ?? {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`YouTube API ${response.status}: ${JSON.stringify(data)}`);
  return data as T;
}

async function youtubeWrite<T>(tournamentId: string, oidcToken: string | undefined, path: string, init: RequestInit, quotaUnits: number, operation: string) {
  await reserveYouTubeQuota(quotaUnits, operation);
  try { return await youtubeRequest<T>(tournamentId, oidcToken, path, init); }
  catch (error) { if (isYouTubeQuotaError(error)) await markYouTubeQuotaBlocked(); throw error; }
}

async function readStationStreamKey(value: string, oidcToken?: string) {
  if (value.startsWith("app-encrypted.v1.") || value.startsWith("gcp-kms.v1.")) return decryptBroadcastSecret(value, oidcToken);
  return value;
}

export async function ensureCustomerStationStream(stationId: string, oidcToken?: string) {
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) throw new Error("Station not found");
  if (station.youtubeStreamId && station.youtubeIngestUrl && station.streamKey) return { streamId: station.youtubeStreamId, ingestUrl: station.youtubeIngestUrl, streamKey: await readStationStreamKey(station.streamKey, oidcToken) };

  const leaseCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const claimed = await db.station.updateMany({ where: { id: stationId, OR: [{ youtubeStreamProvisioningAt: null }, { youtubeStreamProvisioningAt: { lt: leaseCutoff } }] }, data: { youtubeStreamProvisioningAt: new Date() } });
  if (claimed.count !== 1) {
    const current = await db.station.findUnique({ where: { id: stationId }, select: { youtubeStreamId: true, youtubeIngestUrl: true, streamKey: true } });
    if (current?.youtubeStreamId && current.youtubeIngestUrl && current.streamKey) return { streamId: current.youtubeStreamId, ingestUrl: current.youtubeIngestUrl, streamKey: await readStationStreamKey(current.streamKey, oidcToken) };
    throw new Error(`Station ${station.label} is already preparing a YouTube stream. Wait a few seconds and try again.`);
  }

  try {
    const stream = await youtubeWrite<YouTubeStream>(station.tournamentId, oidcToken, "/liveStreams?part=snippet,cdn,contentDetails", { method: "POST", body: JSON.stringify({ snippet: { title: `FGC Stream — ${station.label}` }, cdn: { ingestionType: "rtmp", resolution: "variable", frameRate: "variable" }, contentDetails: { isReusable: true } }) }, YOUTUBE_QUOTA_UNITS.LIVE_STREAM_INSERT, "liveStreams.insert");
    const info = stream.cdn?.ingestionInfo;
    if (!stream.id || !info?.ingestionAddress || !info.streamName) throw new Error("YouTube created the stream but did not provide usable RTMP credentials");
    const encryptedStreamKey = await encryptBroadcastSecret(info.streamName, oidcToken);
    await db.station.update({ where: { id: stationId }, data: { youtubeStreamId: stream.id, youtubeIngestUrl: info.ingestionAddress, ingestUrl: info.ingestionAddress, streamKey: encryptedStreamKey, ingressId: stream.id } });
    return { streamId: stream.id, ingestUrl: info.ingestionAddress, streamKey: info.streamName };
  } finally {
    await db.station.updateMany({ where: { id: stationId }, data: { youtubeStreamProvisioningAt: null } });
  }
}

export async function startCustomerStationBroadcast(matchId: string, oidcToken?: string) {
  const match = await db.match.findUnique({ where: { id: matchId }, include: { station: true, tournament: true, playerOne: true, playerTwo: true } });
  if (!match?.station) throw new Error("Match must be assigned to a station before going LIVE");
  const station = match.station;

  const anotherLiveMatch = await db.match.findFirst({ where: { stationId: station.id, status: "LIVE", id: { not: matchId } }, select: { id: true } });
  if (anotherLiveMatch) throw new Error(`Station ${station.label} is already streaming another match. Complete that match before starting this one.`);

  // Provision/reuse the station's stream first. The stream has its own short
  // provisioning lease; only the broadcast reservation below uses the station
  // broadcast lease, avoiding nested locks on the same row.
  const stream = await ensureCustomerStationStream(station.id, oidcToken);

  const claimed = await db.station.updateMany({ where: { id: station.id, OR: [{ youtubeProvisioningAt: null }, { youtubeProvisioningAt: { lt: new Date(Date.now() - 2 * 60 * 1000) } }] }, data: { youtubeProvisioningAt: new Date() } });
  if (claimed.count !== 1) throw new Error(`Station ${station.label} is already preparing a YouTube broadcast. Wait a few seconds and try again.`);

  try {
    const scheduledStartTime = new Date(Date.now() + 15_000).toISOString();
    const broadcast = await youtubeWrite<YouTubeBroadcast>(match.tournamentId, oidcToken, "/liveBroadcasts?part=snippet,status,contentDetails", { method: "POST", body: JSON.stringify({ snippet: { title: `${match.tournament.name} — ${station.label}`, description: `${match.tournament.name} · ${station.label} · FGC Stream`, scheduledStartTime }, status: { privacyStatus: "unlisted" }, contentDetails: { enableAutoStart: true, enableAutoStop: false, enableDvr: true, recordFromStart: true } }) }, YOUTUBE_QUOTA_UNITS.BROADCAST_INSERT, "liveBroadcasts.insert");
    if (!broadcast.id) throw new Error("YouTube returned no broadcast id");
    try {
      await youtubeWrite(match.tournamentId, oidcToken, `/liveBroadcasts/bind?id=${encodeURIComponent(broadcast.id)}&streamId=${encodeURIComponent(stream.streamId)}&part=id,snippet,contentDetails,status`, { method: "POST" }, YOUTUBE_QUOTA_UNITS.BROADCAST_BIND, "liveBroadcasts.bind");
    } catch (error) {
      try { await youtubeWrite(match.tournamentId, oidcToken, `/liveBroadcasts?id=${encodeURIComponent(broadcast.id)}`, { method: "DELETE" }, YOUTUBE_QUOTA_UNITS.BROADCAST_DELETE, "liveBroadcasts.delete"); }
      catch (cleanupError) { console.error("[youtube customer] failed to clean up orphan broadcast", cleanupError); }
      throw new Error(`YouTube broadcast was created but could not be bound to the station: ${error instanceof Error ? error.message : String(error)}`);
    }
    const now = new Date();
    const updatedMatch = await db.match.update({ where: { id: matchId }, data: { youtubeBroadcastId: broadcast.id, youtubeVideoId: broadcast.id, status: "LIVE", startedAt: match.startedAt ?? now } });
    await db.station.update({ where: { id: station.id }, data: { youtubeBroadcastId: broadcast.id, youtubeVideoId: broadcast.id, youtubeLiveStatus: "starting", youtubeLastStatusAt: now, status: "LIVE", lastHeartbeatAt: now } });
    return { broadcastId: broadcast.id, videoId: broadcast.id, station: updatedMatch };
  } finally {
    await db.station.updateMany({ where: { id: station.id }, data: { youtubeProvisioningAt: null } });
  }
}

export async function stopCustomerStationBroadcast(stationId: string, oidcToken?: string) {
  const station = await db.station.findUnique({ where: { id: stationId }, select: { tournamentId: true, youtubeBroadcastId: true } });
  if (!station?.youtubeBroadcastId) return { ended: false };
  await youtubeWrite(station.tournamentId, oidcToken, `/liveBroadcasts/transition?id=${encodeURIComponent(station.youtubeBroadcastId)}&part=id,status&broadcastStatus=complete`, { method: "POST" }, YOUTUBE_QUOTA_UNITS.BROADCAST_TRANSITION, "liveBroadcasts.transition");
  await db.station.update({ where: { id: stationId }, data: { youtubeBroadcastId: null, youtubeVideoId: null, youtubeLiveStatus: "complete", youtubeLastStatusAt: new Date(), status: "OFFLINE", lastHeartbeatAt: new Date() } });
  return { ended: true };
}
