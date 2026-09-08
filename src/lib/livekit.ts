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
        `Configure it before using LiveKit streaming.`
      );
    }
  }
  return { url: url as string, apiKey: apiKey as string, apiSecret: apiSecret as string };
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

export function roomNameForStation(stationId: string) {
  return `station-${stationId}`;
}

export function ingressParticipantIdentity(stationId: string) {
  return `station-${stationId}`;
}

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
    ingestUrl: ingress.url,
    streamKey: ingress.streamKey,
  };
}

export async function deleteStationIngress(ingressId: string) {
  await getIngressClient().deleteIngress(ingressId);
}

export async function mintViewerToken(roomName: string, identity: string) {
  const { apiKey, apiSecret } = requireLiveKitConfig();
  const token = new AccessToken(apiKey, apiSecret, { identity, ttl: "6h" });
  token.addGrant({ room: roomName, roomJoin: true, canSubscribe: true, canPublish: false });
  return token.toJwt();
}

/**
 * Starts the HLS VOD egress into Supabase Storage's S3-compatible endpoint.
 * We intentionally keep the VOD as segmented HLS rather than also creating
 * a single MP4: the Supabase Free plan has a 50 MB maximum file size, while
 * a full tournament match can easily exceed that size. Individual HLS
 * segments stay small and remain streamable as a VOD playlist.
 */
export async function startRoomEgress(roomName: string, matchId: string, stationId: string) {
  const segmentPrefix = `recordings/${stationId}/${matchId}`;

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
    accessKey: process.env.SUPABASE_S3_ACCESS_KEY_ID!,
    secret: process.env.SUPABASE_S3_SECRET_ACCESS_KEY!,
    region: process.env.SUPABASE_S3_REGION!,
    bucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET!,
    endpoint: process.env.SUPABASE_S3_ENDPOINT!,
    forcePathStyle: true,
  });

  const info = await getEgressClient().startTrackCompositeEgress(
    roomName,
    {
      segments: new SegmentedFileOutput({
        filenamePrefix: `${segmentPrefix}/segment`,
        playlistName: `${segmentPrefix}/index.m3u8`,
        segmentDuration: 4,
        output: { case: "s3", value: s3 },
      }),
    },
    { videoTrackId, audioTrackId }
  );

  return {
    egressId: info.egressId,
    hlsPlaylistKey: `${segmentPrefix}/index.m3u8`,
    mp4Key: null,
  };
}

export async function stopEgress(egressId: string) {
  await getEgressClient().stopEgress(egressId);
}
