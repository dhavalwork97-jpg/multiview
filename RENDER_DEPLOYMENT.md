# Deploying on Render instead of Fly.io

> **Render is only for the three background services (socket server,
> clip worker, AI worker) via the `render.yaml` Blueprint below — never
> for the Next.js app itself.** If you connect this repo as a plain
> **Web Service** (rather than `New → Blueprint`), Render auto-detects
> Node and runs a generic `yarn install; yarn build`, which fails with
> `Couldn't find any 'pages' or 'app' directory` — there isn't one at the
> repo root in the sense a generic Next.js buildpack expects, because
> this repo also contains the three worker services' own Dockerfiles.
> **The Next.js app deploys to Vercel** (`DEPLOYMENT_GUIDE.md` Stage 1).
> Always use `New → Blueprint` here, which reads `render.yaml` and
> creates exactly the three Docker-based services below — nothing else.

## The card situation, corrected

Two separate things were wrong in an earlier pass of this doc, worth
being direct about:

1. **Render's "Background Worker" service type has no free tier at any
   level** — Starter and up, $7/mo minimum, regardless of whether it's
   deployed via Blueprint or created manually. Only **Web Services** and
   static sites have a genuine free tier. `render.yaml` originally
   declared the clip worker and AI worker as `type: worker`, which meant
   they were never going to be free on Render as configured — that's a
   real gap in the earlier version of this doc, not just a card-prompt
   annoyance.
2. **Fixed**: both workers are now `type: web` in `render.yaml`.
   Functionally they're still background job processors (BullMQ
   consumer, polling loop) — `src/lib/health-server.ts` adds a one-line
   HTTP health endpoint to each, purely so Render classifies them as Web
   Services and gives them the free tier that classification carries.

With that fix, all three services in `render.yaml` are on `plan: free`,
and none of them requires a paid plan to exist. Multiple Render forum
reports say Blueprint deploys have, at times, prompted for a card even
for all-free-plan blueprints (a UX quirk, not a hard requirement per
Render's own free-tier documentation) — if that still happens to you,
creating the same three services **manually** (`New → Web Service`,
Docker runtime, point at the same Dockerfile, free plan) instead of via
Blueprint is the documented workaround, and doesn't require a card
either.

## The trade-off this implies: cold starts

Free Web Services on Render sleep after 15 minutes idle, with a 30-60s
cold start on the next request. For the socket server, that's a bad
first experience for a viewer connecting mid-lull in a tournament.
`.github/workflows/keep-render-warm.yml` pings all three every 10
minutes (under the 15-minute threshold) to keep them warm — set the
`RENDER_SOCKET_URL`, `RENDER_CLIP_WORKER_URL`, `RENDER_AI_WORKER_URL`
repo variables (Settings → Secrets and variables → Actions → Variables
tab — these are URLs, not secrets, so the Variables tab rather than
Secrets) once you have each service's URL from step 4 below, and the
workflow does the rest. This is the standard, well-known workaround for
Render's free tier — the alternative is paying for Starter ($7/mo per
service) to avoid sleep entirely, which remains a fine choice if the
$21/mo total matters less to you than the small residual risk of a cold
start slipping through between pings.

**If you'd rather have zero platform friction at all, including this
keep-alive workaround**: see the note at the bottom of this doc about
running the two workers on the same Oracle Cloud VM as the LiveKit media
server instead — genuinely free forever, no sleep, no separate account.

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
- `fgc-stream-clip-worker` should print `[clip-worker] listening for clip-generation jobs` and `[clip-worker] health server on :<port>...`
- `fgc-stream-ai-worker` should print `[ai-worker] starting hype-scoring loop` and its own health server line

## 4. Get each service's public URL

Each service's page shows a URL like `https://fgc-stream-socket.onrender.com`.
Note all three — you need the socket one for Vercel (step 5) and all
three for the keep-alive workflow's repo variables (see above).

## 5. Wire it back into Vercel

```
NEXT_PUBLIC_SOCKET_URL=https://fgc-stream-socket.onrender.com
```

Redeploy the Vercel app.

---

## Verifying it worked

Same checks as `DEPLOYMENT_GUIDE.md`'s "Verifying it worked" section —
the WS tab in dev tools should show a `101 Switching Protocols` against
the `.onrender.com` host. Everything downstream (score updates
propagating live, clips appearing after "Replay last 30s", hype scores
updating on the trending strip) works identically — the only thing that
changed is which platform is running the three background processes.

## Fully free, zero keep-alive workaround: put the workers on the Oracle VM instead

If even the keep-alive-ping workaround feels like more moving parts than
you want: since `ORACLE_FREE_TIER_DEPLOYMENT.md` already has you
provisioning a real, always-on, genuinely-free-forever VM for the
LiveKit media server, that same VM (or Oracle's second free AMD
E2.1.Micro instance, also included in Always Free) can just as easily
run `docker compose` for the clip worker and AI worker too — they're
lightweight (idle-then-bursty FFmpeg calls), and a real VM has no
service-type free-tier restriction to work around at all. This trades
"one more platform account, no sleep, no keep-alive workflow" for "one
more thing running on infrastructure you're already managing." Either
approach is legitimate; which one's better depends on whether you'd
rather manage one more Docker Compose file or one more scheduled GitHub
Action.
