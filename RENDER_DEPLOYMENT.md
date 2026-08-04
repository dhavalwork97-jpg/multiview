# Deploying on Render instead of Fly.io

Fly.io requires a credit card on file for any account doing more than a
tiny free trial (they removed free allowances for new signups in 2024).
Render's Docker-based web services and background workers are the swap:
most current sources say no card is required to deploy on the free/
Starter path (a few older reports disagree — worth confirming yourself at
signup, since this kind of policy does shift).

**This replaces Stage 2 (socket server) and adds Stages 4/5 (clip worker,
AI worker) from `DEPLOYMENT_GUIDE.md` / `PHASE3_DEPLOYMENT_GUIDE.md` /
`PHASE4` — everything else in those guides (Neon, Upstash, Vercel, the
EC2 LiveKit box, S3/CloudFront) is unchanged.** The LiveKit media server
specifically cannot move to Render — same reason it couldn't move to Fly:
no PaaS here exposes the wide UDP port range WebRTC needs. That stage
stays on EC2 regardless of what hosts everything else.

---

## 1. Sign up and connect your repo

1. render.com → sign up (GitHub/GitLab OAuth is the fastest path).
2. Dashboard → **New → Blueprint**.
3. Connect the GitHub repo you pushed in `DEPLOYMENT_GUIDE.md` Stage 1.
4. Render detects `render.yaml` at the repo root automatically and shows
   you all three services it's about to create — confirm.

## 2. Fill in the secrets Render couldn't guess

`render.yaml` marks every service-specific value `sync: false`, meaning
Render creates the env var slot but leaves it blank for you to fill in
via the dashboard (Environment tab on each service):

**fgc-stream-socket:**
```
REDIS_URL=<upstash redis url from DEPLOYMENT_GUIDE.md Stage 0.2>
NEXT_PUBLIC_APP_URL=<your vercel URL>
```

**fgc-stream-clip-worker:**
```
REDIS_URL=<same upstash url>
DATABASE_URL=<neon connection string>
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION=<from PHASE3_DEPLOYMENT_GUIDE.md Stage A.3>
S3_BUCKET_CLIPS=fgc-stream-clips
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=<your cloudfront domain>
```

**fgc-stream-ai-worker:**
```
DATABASE_URL=<same neon string>
REDIS_URL=<same upstash url>
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=<same cloudfront domain>
```

Save each — Render redeploys automatically on env var changes.

## 3. Deploy

Blueprint deploys all three on creation. Watch each service's **Logs**
tab:
- `fgc-stream-socket` should print `[socket] listening on :4000`
- `fgc-stream-clip-worker` should print `[clip-worker] listening for clip-generation jobs`
- `fgc-stream-ai-worker` should print `[ai-worker] starting hype-scoring loop`

## 4. Get the socket server's public URL

`fgc-stream-socket`'s service page shows a URL like
`https://fgc-stream-socket.onrender.com`. Render terminates TLS and
proxies WebSocket upgrades transparently — same as Fly did — so
`socket.io-client` connects to this exactly the way it connected to the
Fly URL before.

## 5. Wire it back into Vercel

Same as before, just a different URL:

```
NEXT_PUBLIC_SOCKET_URL=https://fgc-stream-socket.onrender.com
```

Redeploy the Vercel app.

---

## Verifying it worked

Same checks as `DEPLOYMENT_GUIDE.md`'s "Verifying it worked" section —
the WS tab in dev tools should show a `101 Switching Protocols` against
the `.onrender.com` host now instead of `.fly.dev`. Everything downstream
(score updates propagating live, clips appearing after "Replay last 30s",
hype scores updating on the trending strip) works identically — the only
thing that changed is which platform is running the three background
processes.

## Trade-offs vs. Fly, honestly

- **Cold starts**: only relevant if you drop `fgc-stream-socket` to the
  free plan — don't; `plan: starter` in `render.yaml` already avoids
  this for the one service where a cold start would be visible to
  viewers as a dropped connection.
- **Regions**: Render's region selection is coarser than Fly's — fine
  for this architecture, since the latency-sensitive piece (the LiveKit
  media server) is on its own EC2 box anyway, picked for proximity to
  the venue.
- **No card, in exchange for**: less infrastructure control than Fly's
  `flyctl` gives you, and Render's pricing is plan-based rather than
  granular usage-based — predictable, but you're paying for the
  Starter plan's fixed size even during a quiet week between tournaments.
