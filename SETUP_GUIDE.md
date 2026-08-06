# Setup guide: GitHub to fully live

**Want most of this automated instead of clicking through by hand?**
`scripts/setup.sh` scripts everything that's genuinely scriptable via
each platform's CLI/API (repo creation, schema migration, S3/IAM,
Vercel deploy + env vars, GitHub secrets) and clearly stops with
instructions at the handful of steps that need a human — mainly
first-time account creation and a couple of one-time dashboard
click-throughs (CloudFront's Origin Access Control setup, Render's
Blueprint import) that don't have a clean non-interactive API. Copy
`scripts/.setup.env.example` to `scripts/.setup.env`, fill in what you
have, run it — it tells you exactly what's missing rather than failing
silently. **Running it through Claude Code** (rather than a plain
terminal) gets you the closest thing to "an agent sets this up": it can
execute the script, read its output, and act on the manual-step
instructions it prints.

Everything below is the same setup, explained by hand — useful either as
the thing the script is automating, or as the fallback if you'd rather
not hand over API tokens to a script at all.

---

Everything below in order, start to finish. Each stage links to its
detailed guide for the specifics; this doc is the ordering, the
cross-connections between stages, and — new here — the **full env var
and GitHub secrets reference**, which was previously scattered across
four separate docs.

**Why this order:** several stages need another stage's output before
they can be configured (the socket server needs Vercel's URL for CORS;
Vercel needs the socket server's URL to connect to it; webhooks need a
live URL to point at before they can be registered). Following this
order means you only fill in each env var once, instead of circling back.

**Accounts you'll need, gathered up front:** GitHub, Vercel, Render (or
Fly), Neon, Upstash, Oracle Cloud (or AWS), AWS (for S3/CloudFront
regardless of which VM provider), Clerk, Stripe.

---

## 0. Push to GitHub

```bash
cd fgc-stream
git init
git add .
git commit -m "fgc-stream, phases 1-5"
```

Create a new repo on GitHub (**without** a README/gitignore — you
already have one), then:

```bash
git remote add origin https://github.com/<you>/fgc-stream.git
git branch -M main
git push -u origin main
```

Every platform below connects to this repo, either for auto-deploy
(Vercel, Render) or via GitHub Actions (`.github/workflows/`).

---

## 1. Data layer — do this before anything else

Every other stage needs these connection strings.

### 1.1 Postgres (Neon)

neon.tech → new project → copy the **pooled** connection string. This is
your `DATABASE_URL` everywhere below.

### 1.2 Redis (Upstash) — you need both forms

upstash.com → new Redis database →

- **`REDIS_URL`**: the `rediss://...` connection string — used by
  everything that holds a persistent TCP connection (the socket server,
  BullMQ in the clip worker).
- **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`**: from the
  same database's REST API tab — used only by the rate limiter
  (`src/lib/rate-limit.ts`) in Vercel's serverless functions, which can't
  hold a TCP connection open the way the other services do.

### 1.3 Apply the schema

```bash
DATABASE_URL="<neon pooled url>" npx prisma migrate deploy
```

---

## 2. Third-party accounts — create these now, wire them in later

You need real keys from each before deploying, but you'll come back and
add webhook URLs once you have a live Vercel URL (step 4).

- **Clerk**: dashboard.clerk.com → new application → copy
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (production
  keys, not the `pk_test_`/`sk_test_` ones from local dev).
- **Stripe**: dashboard.stripe.com → create a Product ("Premium") with a
  recurring Price → copy the price ID as `STRIPE_PREMIUM_PRICE_ID` →
  copy your secret key as `STRIPE_SECRET_KEY`.
- **AWS**: create the two S3 buckets, the CloudFront distribution, and
  the scoped IAM user — full steps in `PHASE3_DEPLOYMENT_GUIDE.md` Stage
  A. Come back here with `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_REGION`, `S3_BUCKET_VODS`, `S3_BUCKET_CLIPS`,
  `CLOUDFRONT_DOMAIN`.

---

## 3. Stage 1 — Next.js app on Vercel

Full steps: `DEPLOYMENT_GUIDE.md` Stage 1. Short version: import the repo
on vercel.com, add every env var you have so far (see the reference
table in section 8 below for exactly which ones), deploy, note the URL
(`https://<your-app>.vercel.app`), then set `NEXT_PUBLIC_APP_URL` to that
and redeploy.

**Leave these blank for now** — they need stages that don't exist yet:
`NEXT_PUBLIC_SOCKET_URL`, `LIVEKIT_*`, `CLERK_WEBHOOK_SIGNING_SECRET`,
`STRIPE_WEBHOOK_SECRET`. You'll fill each in as its stage comes online.

---

## 4. Stages 2, 4, 5 — Socket server, clip worker, AI worker on Render

Full steps: `RENDER_DEPLOYMENT.md`. Short version: Render dashboard → New
→ Blueprint → point at the repo → it reads `render.yaml` and creates all
three services → fill in each service's env vars (table below) → note
the socket service's URL (`https://fgc-stream-socket.onrender.com`).

(If you'd rather use Fly instead — same three services, but requires a
card — see `DEPLOYMENT_GUIDE.md` Stage 2 and `PHASE3_DEPLOYMENT_GUIDE.md`
Stage C for the Fly path instead of this one.)

**Now go back to Vercel** and set `NEXT_PUBLIC_SOCKET_URL` to the Render
socket URL, redeploy.

---

## 5. Stage 3 — LiveKit media server

Full steps: `ORACLE_FREE_TIER_DEPLOYMENT.md` (free, recommended) or
`PHASE3_DEPLOYMENT_GUIDE.md` Stage B (EC2, time-limited free credit).
Short version: provision the VM, open the port table (both guides list
it), generate real API keys (`docker run --rm livekit/livekit-server
generate-keys`), fill them into `infra/livekit/*.yaml`, point DNS at the
VM's IP, `docker compose up -d`.

**Now go back to Vercel** and set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
`LIVEKIT_WS_URL`, `LIVEKIT_HTTP_URL`, redeploy. Then add a `webhook`
block to `livekit.yaml` on the VM pointing at
`https://<your-vercel-url>/api/webhooks/livekit` (exact steps:
`PHASE3_DEPLOYMENT_GUIDE.md` Stage D.1) and `docker compose restart
livekit-server`.

---

## 6. Wire up the webhooks that needed a live URL

Now that Vercel has a real URL, go back to Clerk and Stripe:

- **Clerk**: dashboard → Webhooks → Add Endpoint →
  `https://<your-vercel-url>/api/webhooks/clerk` → subscribe to
  `user.created`/`user.updated`/`user.deleted` → copy the signing secret
  into Vercel's `CLERK_WEBHOOK_SIGNING_SECRET`, redeploy.
- **Stripe**: dashboard → Webhooks → Add Endpoint →
  `https://<your-vercel-url>/api/webhooks/stripe` → subscribe to
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted` → copy the signing secret into
  Vercel's `STRIPE_WEBHOOK_SECRET`, redeploy.

At this point every stage is deployed and every stage knows how to reach
every other stage it needs to.

---

## 7. GitHub Actions secrets — for the CI/CD from Phase 5

Repo → Settings → Secrets and variables → Actions. These power the
workflows in `.github/workflows/`:

| Secret | Used by | Value |
|---|---|---|
| `PRODUCTION_DATABASE_URL` | `deploy-migrations.yml` | same Neon URL as `DATABASE_URL` |
| `MEDIA_SERVER_HOST` | `deploy-media-server.yml` | your LiveKit VM's IP or domain |
| `MEDIA_SERVER_SSH_USER` | `deploy-media-server.yml` | e.g. `ubuntu` |
| `MEDIA_SERVER_SSH_KEY` | `deploy-media-server.yml` | the private key matching the VM's authorized key |
| `FLY_API_TOKEN` | `deploy-fly-workers.yml` | only needed if you used Fly instead of Render for stage 2/4/5 |

Everything else (`ci.yml`, `codeql.yml`, `e2e.yml`) needs no secrets —
`e2e.yml` gets its target URL from Vercel's own deployment webhook
automatically, and Vercel/Render redeploy themselves via their native
GitHub integrations without any repo secret at all.

**Optional but recommended**: Settings → Environments → create
`production` → add required reviewers. This gates `deploy-migrations.yml`
and `deploy-media-server.yml` (both declare `environment: production`)
behind a manual approval, so a schema change or media-server config push
doesn't hit production unattended.

**Also add, as repo *Variables* (Settings → Secrets and variables →
Actions → Variables tab — these are URLs, not secrets)**, once you have
them from `RENDER_DEPLOYMENT.md` step 4: `RENDER_SOCKET_URL`,
`RENDER_CLIP_WORKER_URL`, `RENDER_AI_WORKER_URL`. These power
`keep-render-warm.yml`, which pings all three free-tier Render services
every 10 minutes so they don't cold-start on a viewer mid-tournament.
Not needed if you went the Fly or Oracle-VM route for these services
instead — see `RENDER_DEPLOYMENT.md`'s note on running the two workers
on the Oracle VM as a keep-alive-free alternative.

---

## 8. Full environment variable reference

Every var, every place it needs to live. `.env.example` documents the
same set for local dev; this table is the same set mapped to where each
one actually runs in production.

| Variable | Vercel | Render socket | Render clip-worker | Render ai-worker | LiveKit VM | GitHub Actions |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `DATABASE_URL` | Yes | | Yes | Yes | | Yes (as `PRODUCTION_DATABASE_URL`) |
| `REDIS_URL` | Yes | Yes | Yes | Yes | | |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Yes | | | | | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Yes | | | | | |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Yes | | | | | |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PREMIUM_PRICE_ID` | Yes | | | | | |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | Yes | | Yes | | Yes (egress config) | |
| `S3_BUCKET_VODS` | Yes | | | | Yes | |
| `S3_BUCKET_CLIPS` | Yes | | Yes | | | |
| `CLOUDFRONT_DOMAIN` | Yes | | | | | |
| `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` | Yes | | Yes | Yes | | |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Yes | | | | Yes (all three configs) | |
| `LIVEKIT_WS_URL` / `LIVEKIT_HTTP_URL` | Yes | | | | | |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | | | Yes (webhook target) | |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | | | | | |
| `MEDIA_SERVER_HOST` / `_SSH_USER` / `_SSH_KEY` | | | | | | Yes |
| `FLY_API_TOKEN` | | | | | | Yes (Fly path only) |

---

## 9. Verifying the whole thing end to end

Each stage's own guide has a stage-specific check (the `DEPLOYMENT_GUIDE.md`
WS-connection check, the `PHASE3_DEPLOYMENT_GUIDE.md` OBS-stream check).
The full-system version: create a tournament and a station through the
admin UI, get a stream key from `POST /api/stations/:id/ingress`, push
RTMP from anywhere, and confirm — in order — the LiveKit VM's logs show
the connection, the dashboard's live grid updates via the socket server,
the watch page's HLS player starts playing, "Replay last 30s" produces a
real clip via the Render clip worker, and the hype score on the trending
strip starts moving via the AI worker. That chain touches all six stages
in one pass — if it works end to end, everything is wired correctly.
