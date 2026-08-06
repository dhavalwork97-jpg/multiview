# Streaming architecture (Phase 3)

## The one decision everything else follows from

**A WebRTC SFU doesn't cheaply serve 100,000 viewers; a CDN does.** Every
viewer connection to a WebRTC SFU is a real subscription the media server
has to forward packets for — that's what makes it low-latency, and it's
also what makes it expensive to fan out. HLS behind CloudFront turns
"100,000 viewers" into "100,000 cache hits," which is a completely
different, much cheaper problem.

So: **HLS via CloudFront is the default and only viewing path for
multi-view and general browsing. WebRTC is an explicit opt-in
"low-latency mode"** a viewer can switch to on one match at a time (see
`VideoPlayer.tsx`). This isn't a compromise so much as using each
transport for what it's actually good at.

## Pipeline, end to end

```
PS5 capture rig (OBS/hardware encoder)
        │  RTMP
        ▼
LiveKit Ingress  ──────────────────────────┐
        │  publishes into a room             │  transcodes to WebRTC-
        │  (one room per Station)            │  compatible format
        ▼                                    │
LiveKit Server (SFU)                         │
        │                                    │
        ├── WebRTC subscribers ◄──────────────┘ (low-latency mode viewers)
        │
        ▼
LiveKit Egress (started automatically — see webhook below)
        ├── segmented HLS  → S3 (recordings/{stationId}/{matchId}/*.ts + index.m3u8)
        └── full MP4       → S3 (vods/{stationId}/{matchId}/full.mp4)
                │
                ▼
        CloudFront (public read, cached)
                │
                ├── viewers watching HLS (default path)
                └── FFmpeg clip worker (reads segments, cuts, re-uploads to clips/)
```

Every arrow that crosses a service boundary above is a real, separately
deployed piece — see "The three deployable stages" below.

## Auto-recording, DVR, and instant replay are the same mechanism

`POST /api/webhooks/livekit` receives LiveKit's `room_started` event the
moment a station's encoder connects and starts publishing. It immediately
calls `startRoomEgress` (`src/lib/livekit.ts`), which starts **one**
egress job with two outputs: a segmented HLS playlist and a full MP4.
One encoding pass, two outputs — no separate "recording" step to forget
to trigger.

- **HLS fallback / default viewing** reads the growing playlist directly.
- **DVR** is just `hls.js` configured with a long `backBufferLength`
  against that same live playlist (`HlsPlayer.tsx`) — no separate DVR
  system, it falls out of HLS's segment model for free.
- **Instant replay** (`ClipControls.tsx`, "Replay last 30s") is a clip
  request against that same live playlist while the match is still in
  progress — FFmpeg (`clip-worker.ts`) seeks into the *live* HLS source
  over HTTP and cuts, so it works before the match ends, not just after.
- **Auto recording** is just: this whole thing happens without an
  organizer clicking anything.

`room_finished` stops the egress; the `egress_ended` webhook event marks
the `Recording` row `READY` once the MP4 is finalized in S3.

## Storage layout (S3)

```
s3://<vods-bucket>/
  recordings/{stationId}/{matchId}/index.m3u8   ← live + finished HLS playlist
  recordings/{stationId}/{matchId}/segment-*.ts
  vods/{stationId}/{matchId}/full.mp4            ← finalized full-match VOD

s3://<clips-bucket>/
  clips/{matchId}/{clipId}.mp4
```

CloudFront points at both buckets as origins; nothing is served directly
from S3. URLs are built in one place (`src/lib/cdn.ts`) so the key layout
above only has to be right in one place.

## Adaptive bitrate

Handled by LiveKit's simulcast on the ingest side (the Ingress publishes
multiple quality layers; the SFU forwards whichever layer fits each
WebRTC subscriber's bandwidth) and, for the HLS path, would need a
multi-rendition egress output (multiple `segment_outputs` at different
resolutions) — the current `egress-config.yaml`/`startRoomEgress` set up
a single rendition. Multi-rendition HLS is the natural next increment
here and is flagged rather than silently assumed done.

## The three deployable stages

| Stage | What | Where | Why there |
|---|---|---|---|
| 1 | Next.js app | Vercel | stateless request/response, native fit |
| 2 | Socket.IO server | Fly.io | long-lived process, doesn't need public UDP |
| 3 | **LiveKit media server** (server + ingress + egress) | **AWS EC2 (or Oracle Cloud Always Free — see `ORACLE_FREE_TIER_DEPLOYMENT.md`)** | needs direct UDP reachability across a wide port range — PaaS proxied networking doesn't give you this |
| 4 | **Clip worker** | **Fly.io** | idle-then-bursty FFmpeg jobs; no public ports needed, just outbound to S3/Redis |

Stage 3 is the one that can't go on Vercel/Fly and needs a real VM — see
`PHASE3_DEPLOYMENT_GUIDE.md` for provisioning steps. Stage 4 could
technically share the Stage 3 VM (it needs the same `ffmpeg` binary
anyway), but keeping it as its own Fly app means a clip-generation spike
during a hype match can't compete with the SFU for CPU on the same
machine — worth the small extra ops overhead.

## What's honestly still missing after this phase

- **Multi-rendition adaptive bitrate on the HLS path** (noted above).
- **Signed/expiring CloudFront URLs.** VOD and clip URLs are public right
  now — fine for a public tournament stream, not fine the moment
  pay-per-view or region-locked broadcast rights (Phase 4/5 territory)
  enter the picture.
- **Egress job supervision.** If the EC2 box running Egress dies mid-match,
  nothing currently restarts the recording — `room_started` fires once.
  A reconciliation loop (poll LiveKit's active-room list, diff against
  `Recording` rows in `RECORDING` status) is the fix, not yet built.
- **The clip worker's `match:updated` piggyback** — flagged inline in
  `clip-worker.ts` as a shortcut that should become its own `clip:ready`
  event before real traffic.
