import {
  RoomServiceClient,
  IngressClient,
  EgressClient,
  AccessToken,
  IngressInput,
  type IngressAudioOptions,
  type IngressVideoOptions,
} from "livekit-server-sdk";
import { EncodedFileOutput, EncodedFileType, SegmentedFileOutput, S3Upload } from "@livekit/protocol";

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
 * LiveKit Cloud runs egress for you, but still needs to be told WHERE to
 * upload — with no destination, room-composite egress has nothing valid
 * to write to and rejects the request with a 400. S3Upload also works
 * against any S3-compatible provider (Backblaze B2, Cloudflare R2,
 * etc.) — S3_ENDPOINT is required whenever the bucket isn't real AWS S3.
 */
export async function startRoomEgress(roomName: string, matchId: string, stationId: string) {
  const filePrefix = `vods/${stationId}/${matchId}`;
  const segmentPrefix = `recordings/${stationId}/${matchId}`;

  const s3 = new S3Upload({
    accessKey: process.env.AWS_ACCESS_KEY_ID!,
    secret: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION!,
    bucket: process.env.S3_BUCKET_CLIPS!,
    endpoint: process.env.S3_ENDPOINT ?? "",
    forcePathStyle: true,
  });

  const info = await egressClient.startRoomCompositeEgress(roomName, {
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
  });

  return { egressId: info.egressId, hlsPlaylistKey: `${segmentPrefix}/index.m3u8`, mp4Key: `${filePrefix}/full.mp4` };
}

export async function stopEgress(egressId: string) {
  await egressClient.stopEgress(egressId);
}