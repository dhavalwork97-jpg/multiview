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

const LIVEKIT_HTTP_URL = process.env.LIVEKIT_HTTP_URL!;
const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;

export const roomService = new RoomServiceClient(LIVEKIT_HTTP_URL, API_KEY, API_SECRET);
export const ingressClient = new IngressClient(LIVEKIT_HTTP_URL, API_KEY, API_SECRET);
export const egressClient = new EgressClient(LIVEKIT_HTTP_URL, API_KEY, API_SECRET);

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

  const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
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
  await ingressClient.deleteIngress(ingressId);
}

/**
 * Viewer access token for the WebRTC low-latency path — subscribe-only,
 * short-lived (LiveKit tokens are JWTs with their own exp claim, default
 * ~6h, fine for a single viewing session). Publish grants are never given
 * to viewer tokens; only the ingress (via its own service credentials)
 * publishes into a station's room.
 */
export async function mintViewerToken(roomName: string, identity: string) {
  const token = new AccessToken(API_KEY, API_SECRET, { identity, ttl: "6h" });
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
  // look up the ingress's own published tracks. There's exactly one
  // publisher per station room (the RTMP ingress), so the first audio and
  // first video track found are unambiguously the right ones.
  const identity = ingressParticipantIdentity(stationId);
  let participant;
  try {
    participant = await roomService.getParticipant(roomName, identity);
  } catch {
    // Same race as the "no video track" case below, just earlier — the
    // ingress hasn't even joined the room yet (RTMP handshake still in
    // progress). Normalize to the same "No published video track found"
    // message so callers (the LiveKit webhook route) can treat both as
    // one benign, retry-on-track_published condition instead of two.
    throw new Error(
      `No published video track found for station=${stationId} room=${roomName} — ingress participant hasn't joined the room yet`
    );
  }
  const videoTrackId = participant.tracks.find((t) => t.type === TrackType.VIDEO)?.sid;
  const audioTrackId = participant.tracks.find((t) => t.type === TrackType.AUDIO)?.sid;

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

  const info = await egressClient.startTrackCompositeEgress(
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
  await egressClient.stopEgress(egressId);
}