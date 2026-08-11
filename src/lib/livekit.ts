import {
  RoomServiceClient,
  IngressClient,
  EgressClient,
  AccessToken,
  IngressInput,
  type IngressAudioOptions,
  type IngressVideoOptions,
} from "livekit-server-sdk";
import {
  EncodedFileOutput,
  EncodedFileType,
  SegmentedFileOutput,
  S3Upload,
  TrackType,
} from "@livekit/protocol";

function requireLiveKitConfig() {
  const url = process.env.LIVEKIT_HTTP_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  for (const [name, value] of [
    ["LIVEKIT_HTTP_URL", url],
    ["LIVEKIT_API_KEY", apiKey],
    ["LIVEKIT_API_SECRET", apiSecret],
  ] as const) {
    if (!value) {
      throw new Error(
        `Missing required env var ${name} — LiveKit is only required when a LiveKit route is actually used. ` +
        `Configure it in the Next.js/Vercel service before using LiveKit streaming.`
      );
    }
  }
  return {
    url: url as string,
    apiKey: apiKey as string,
    apiSecret: apiSecret as string,
  };
}

export function getRoomService() {
  const { url, apiKey, apiSecret } = requireLiveKitConfig();
  return new RoomServiceClient(url, apiKey, apiSecret);
}

export function getIngressClient() {
  const { url, apiKey, apiSecret } = requireLiveKitConfig();
  return new IngressClient(url, apiKey, apiSecret);
}

export function getEgressClient() {
  const { url, apiKey, apiSecret } = requireLiveKitConfig();
  return new EgressClient(url, apiKey, apiSecret);
}

/** One LiveKit room per Station, named by station id — stable for the
 * station's lifetime so re-assigning matches onto it doesn't require
 * tearing down and recreating the room. */
export function roomNameForStation(stationId: string) {
  return `station-${stationId}`;
}

/** Identity the RTMP ingress publishes under — see createStationIngress. */
export function ingressParticipantIdentity(stationId: string) {
  return `station-${stationId}`;
}

/**
 * Creates (or replaces) the RTMP ingress for a station. Called from
 * POST /api/stations/:id/ingress when an organizer registers a station's
 * encoder. Returns the RTMP URL + stream key the encoder box is
 * configured with — this is the thing that gets handed to whoever is
 * setting up that PS5 capture rig.
 */
export async function createStationIngress(stationId: string, label: string) {
  const roomName = roomNameForStation(stationId);

  const ingress = await getIngressClient().createIngress(IngressInput.RTMP_INPUT, {
    name: label,
    roomName,
    participantIdentity: `station-${stationId}`,
    participantName: label,
  });

  return {
    roomName,
    ingressId: ingress.ingressId,
    ingestUrl: ingress.url, // rtmp://...
    streamKey: ingress.streamKey,
  };
}

export async function deleteStationIngress(ingressId: string) {
  await getIngressClient().deleteIngress(ingressId);
}

/**
 * Viewer access token for the WebRTC low-latency path — subscribe-only,
 * short-lived (LiveKit tokens are JWTs with their own exp claim, default
 * ~6h, fine for a single viewing session). Publish grants are never given
 * to viewer tokens; only the ingress (via its own service credentials)
 * publishes into a station's room.
 */
export async function mintViewerToken(roomName: string, identity: string) {
  const { apiKey, apiSecret } = requireLiveKitConfig();
  const token = new AccessToken(apiKey, apiSecret, { identity, ttl: "6h" });
  token.addGrant({ room: roomName, roomJoin: true, canSubscribe: true, canPublish: false });
  return token.toJwt();
}

/**
 * Starts a dual-output egress job for a station's room the moment it goes
 * live: a full-match MP4 (for the permanent VOD) and a segmented HLS
 * playlist (for the CloudFront viewing path AND the clip worker's source
 * material — see src/server/streaming/clip-worker.ts). One job, two
 * outputs, so encoding only happens once.
 *
 * Uses Track Composite egress (one audio track + one video track, straight
 * to the encoder) rather than Room Composite egress. Room Composite renders
 * a full web-page layout of the room through a headless Chrome instance per
 * station — by far the heaviest, slowest-to-start, most rate-limited egress
 * type LiveKit offers, and the direct cause of a previous free-tier quota
 * exhaustion (see STREAMING_ARCHITECTURE.md). A station only ever has one
 * publisher (the RTMP ingress), so there's no layout to render in the first
 * place — Track Composite gets identical MP4 + HLS output for a single
 * source without spinning up a browser at all.
 *
 * LiveKit Cloud runs egress for you, but still needs to be told WHERE to
 * upload — with no destination, egress has nothing valid to write to and
 * rejects the request with a 400. S3Upload also works against any
 * S3-compatible provider (Backblaze B2, Cloudflare R2, etc.) — S3_ENDPOINT
 * is required whenever the bucket isn't real AWS S3.
 */
export async function startRoomEgress(roomName: string, matchId: string, stationId: string) {
  const filePrefix = `vods/${stationId}/${matchId}`;
  const segmentPrefix = `recordings/${stationId}/${matchId}`;

  // Track Composite needs explicit track IDs rather than "just the room" —
  // look up whoever's actually publishing. A station's room only ever has
  // one publisher (the RTMP ingress) by design, so rather than assuming a
  // predicted identity (station-${stationId}) and looking that participant
  // up directly, just scan every participant in the room for one with a
  // published video track.
  //
  // This used to call roomService.getParticipant(roomName, predictedIdentity)
  // instead — but that predicted identity is only a request, not a
  // guarantee: LiveKit Cloud's hosted RTMP ingress doesn't necessarily
  // preserve participantIdentity exactly the way self-hosted LiveKit does,
  // and Room Composite egress (the original approach here) never
  // exercised this assumption at all, since it recorded whatever was in
  // the room regardless of who published it. Switching to Track Composite
  // silently introduced this dependency, and it was wrong: track_published
  // kept firing with a real video track in the room while the identity
  // check filtered it out every time, so egress never started.
  const participants = await getRoomService().listParticipants(roomName);
  const publisher = participants.find((p) =>
    p.tracks.some((t) => t.type === TrackType.VIDEO)
  );

  if (!publisher) {
    throw new Error(
      `No published video track found for station=${stationId} room=${roomName} — encoder may not have finished connecting yet`
    );
  }

  const videoTrackId = publisher.tracks.find((t) => t.type === TrackType.VIDEO)?.sid;
  const audioTrackId = publisher.tracks.find((t) => t.type === TrackType.AUDIO)?.sid;

  if (!videoTrackId) {
    throw new Error(
      `No published video track found for station=${stationId} room=${roomName} — encoder may not have finished connecting yet`
    );
  }

  const s3 = new S3Upload({
    accessKey: process.env.AWS_ACCESS_KEY_ID!,
    secret: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION!,
    bucket: process.env.S3_BUCKET_CLIPS!,
    endpoint: process.env.S3_ENDPOINT ?? "",
    forcePathStyle: true,
  });

  const info = await getEgressClient().startTrackCompositeEgress(
    roomName,
    {
      file: new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `${filePrefix}/full.mp4`,
        output: { case: "s3", value: s3 },
      }),
      segments: new SegmentedFileOutput({
        filenamePrefix: `${segmentPrefix}/segment`,
        playlistName: `${segmentPrefix}/index.m3u8`,
        segmentDuration: 4,
        output: { case: "s3", value: s3 },
      }),
    },
    { videoTrackId, audioTrackId }
  );

  return { egressId: info.egressId, hlsPlaylistKey: `${segmentPrefix}/index.m3u8`, mp4Key: `${filePrefix}/full.mp4` };
}

export async function stopEgress(egressId: string) {
  await getEgressClient().stopEgress(egressId);
}