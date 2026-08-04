> **Note:** Stage C below (the clip worker) uses Fly.io, which requires a
> credit card. See `RENDER_DEPLOYMENT.md` for a no-card alternative
> covering this worker and the Phase 4 AI worker together. Stage B (the
> LiveKit media server, EC2) is unaffected either way — no PaaS handles
> the UDP range it needs.

# Deploying Phase 3 online

Builds on `DEPLOYMENT_GUIDE.md` (Vercel app + Fly socket server). This
adds two more pieces, both online, nothing local: the LiveKit media
server on an EC2 VM, and the clip worker on Fly. By the end, a station
encoder anywhere on the internet can push RTMP to a public endpoint and
viewers anywhere can watch — nothing here talks to `localhost`.

---

## Stage A — S3 buckets + CloudFront (do this first, everything else references it)

### A.1 Create the buckets

AWS Console → S3 → **Create bucket**, twice:

- `fgc-stream-vods` (or your own name — matches `S3_BUCKET_VODS`)
- `fgc-stream-clips` (matches `S3_BUCKET_CLIPS`)

Block public access on both (CloudFront will read them via an Origin
Access Control, not directly).

### A.2 Create a CloudFront distribution

1. CloudFront → **Create distribution**.
2. Origin: the `fgc-stream-vods` bucket, origin access = **Origin Access
   Control (OAC)** — CloudFront will offer to update the bucket policy
   for you; accept it.
3. Add a second origin + behavior for `fgc-stream-clips` under the
   `/clips/*` path pattern.
4. Viewer protocol policy: **Redirect HTTP to HTTPS**.
5. Note the distribution's domain, e.g. `d1234abcd.cloudfront.net`. This
   is your `CLOUDFRONT_DOMAIN` / `NEXT_PUBLIC_CLOUDFRONT_DOMAIN`.

### A.3 IAM user for programmatic S3 access

IAM → **Create user** → attach an inline policy scoped to `PutObject`/
`GetObject` on just those two buckets (not full S3 access). Save the
access key + secret — these become `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`, used by both LiveKit Egress and the clip worker.

---

## Stage B — LiveKit media server on a VM

**Note on cost:** these steps use AWS EC2, which — as of AWS's July 2025
free tier changes — no longer gives new accounts a lasting free VM (you
get a $200 credit that draws down over 6 months, then it's paid). If you
want a genuinely free-indefinitely option instead, see
`ORACLE_FREE_TIER_DEPLOYMENT.md`, which replaces this stage only —
everything else in this guide is unchanged either way. Google Cloud's
always-free e2-micro is also an option but too small for real Egress
load; fine for the "watch it work" step in isolation, not for actual
tournament traffic.

### B.1 Launch the instance

EC2 → **Launch instance**:

- AMI: Ubuntu 24.04 LTS
- Instance type: `c6i.xlarge` (4 vCPU/8GB) as a starting point — Egress's
  Chrome-based room-composite jobs are the CPU-hungry part; resize based
  on how many stations you're recording concurrently.
- **Elastic IP**: allocate and associate one — station encoders and
  viewers need a stable address to point at.
- Security group, inbound rules:

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH (your IP only) |
| 80, 443 | TCP | HTTP/TLS, LiveKit signaling |
| 1935 | TCP | RTMP ingest (station encoders connect here) |
| 7881 | TCP | WebRTC over TCP (fallback) |
| 3478 | UDP | TURN |
| 5349 | TCP | TURN over TLS |
| 7885 | UDP | WHIP ingest |
| 50000–60000 | UDP | WebRTC media (the wide range `livekit.yaml` reserves) |

### B.2 DNS

Point two A records at the Elastic IP:
- `media.fgcstream.com` (LiveKit signaling/API — matches `LIVEKIT_WS_URL`/`LIVEKIT_HTTP_URL`)
- `turn.fgcstream.com` (matches `livekit.yaml`'s `turn.domain`)

### B.3 Install Docker and pull the stack

SSH in, then:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out/in for the group change to apply
```

Copy `infra/livekit/` from this repo onto the box (`scp` or `git clone`
the repo there directly).

### B.4 Generate real API keys and fill in the configs

```bash
docker run --rm livekit/livekit-server generate-keys
```

This prints an API key/secret pair. Replace every
`APIKeyPlaceholder`/`secretPlaceholder` in `livekit.yaml`,
`ingress-config.yaml`, and `egress-config.yaml` with it. Also edit
`livekit.yaml`'s `turn.domain` to your real `turn.fgcstream.com`.

### B.5 TLS

LiveKit needs TLS for signaling and TURN. Simplest path: put
[Caddy](https://caddyserver.com) in front as a reverse proxy on the same
box (automatic Let's Encrypt certs), forwarding `443` → `livekit-server`'s
`7880`. (A full Caddy config is a reasonable Phase 5 CI/CD-adjacent
addition — for now, any reverse proxy with a valid cert in front of port
7880 satisfies this.)

### B.6 Start the stack

```bash
cd infra/livekit
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1 S3_BUCKET_VODS=fgc-stream-vods
docker compose up -d
docker compose logs -f   # confirm all three services report healthy
```

---

## Stage C — Clip worker on Fly.io

Same pattern as the Stage 2 socket server from `DEPLOYMENT_GUIDE.md`:

```bash
fly launch --config fly.clip-worker.toml --no-deploy
fly secrets set --config fly.clip-worker.toml \
  REDIS_URL="<upstash redis url>" \
  DATABASE_URL="<neon connection string>" \
  AWS_ACCESS_KEY_ID="..." AWS_SECRET_ACCESS_KEY="..." AWS_REGION="us-east-1" \
  S3_BUCKET_CLIPS="fgc-stream-clips" \
  NEXT_PUBLIC_CLOUDFRONT_DOMAIN="d1234abcd.cloudfront.net"
fly deploy --config fly.clip-worker.toml
```

---

## Stage D — wire everything back into Vercel

Vercel → Environment Variables, add:

```
LIVEKIT_API_KEY=<from B.4>
LIVEKIT_API_SECRET=<from B.4>
LIVEKIT_WS_URL=wss://media.fgcstream.com
LIVEKIT_HTTP_URL=https://media.fgcstream.com
CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION / S3_BUCKET_VODS / S3_BUCKET_CLIPS
```

Redeploy.

### D.1 Point LiveKit's webhook at Vercel

On the EC2 box, add a `webhook` block to `livekit.yaml`:

```yaml
webhook:
  urls:
    - https://<your-vercel-url>/api/webhooks/livekit
  api_key: APIKeyPlaceholder   # same key as above
```

`docker compose restart livekit-server`. LiveKit signs webhook payloads
with your API secret — `src/app/api/webhooks/livekit/route.ts` verifies
that signature via `WebhookReceiver`, using the same `LIVEKIT_API_KEY`/
`LIVEKIT_API_SECRET` already set in Vercel. No separate webhook secret
exists or needs generating.

---

## Verifying it worked

1. On a machine anywhere (doesn't need to be near the EC2 box), configure
   OBS: Server = `rtmp://media.fgcstream.com/live`, Stream Key = one
   generated via `POST /api/stations/:id/ingress` (call it once you've
   created a station through the admin UI). Start streaming.
2. Within a few seconds you should see, in order: the EC2 box's
   `docker compose logs` show the ingress accept the connection → the
   dashboard's live grid update (via the webhook → Redis → Socket.IO
   chain) → the station's status flip to LIVE.
3. Open `/watch/:matchId` for that match. The HLS player should start
   playing within ~10-15 seconds (a few segments need to buffer first —
   this delay is the latency/scale trade described in
   `STREAMING_ARCHITECTURE.md`). Try "Switch to low-latency (WebRTC)" and
   confirm it connects with noticeably less delay.
4. Click "Replay last 30s" once you're at least 30 seconds into the
   stream, wait ~10 seconds, then `GET /api/clips?matchId=...` and
   confirm a `READY` clip with a working `s3Key` shows up.

If RTMP won't connect: it's almost always the EC2 security group missing
port 1935, or the stream key being stale (re-run the ingress endpoint).
If the webhook never fires: check `docker compose logs livekit-server`
for webhook delivery errors — usually a mismatched API key between
`livekit.yaml`'s `webhook.api_key` and what Vercel has as
`LIVEKIT_API_KEY`.

---

## What's still missing after this phase

Everything listed under "What's honestly still missing" in
`STREAMING_ARCHITECTURE.md` — multi-rendition ABR on HLS, signed CDN
URLs, egress crash recovery, and splitting the clip-ready event out of
`match:updated`. None of these block a working end-to-end stream; they're
the gaps between "works" and "production-hardened," which is explicitly
Phase 5 scope.
