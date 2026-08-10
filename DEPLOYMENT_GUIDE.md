> **Note:** Stage 2 below (the socket server) uses Fly.io, which requires
> a credit card on file. If you'd rather not do that, see
> `RENDER_DEPLOYMENT.md` for a no-card alternative that replaces Stage 2
> and covers the Phase 3/4 worker services too — everything else in this
> guide (Neon, Upstash, Vercel) is identical either way.

# Deploying online instead of locally

Right now you run two processes on your machine:

1. `npm run dev` — the Next.js app (pages, API routes, Prisma)
2. `npm run socket:dev` — the Socket.IO real-time server

They need different homes online, because Vercel (the natural fit for
Next.js) doesn't run long-lived processes like a WebSocket server. This
guide stands both up, in order, so nothing is left pointing at
`localhost` by the end.

**Order matters** — set up the databases first, since both stages need
their connection strings before they'll boot.

---

## Stage 0 — Managed database + Redis (both stages depend on these)

### 0.1 Postgres on Neon

1. Create a free account at neon.tech, create a project named `fgc-stream`.
2. Copy the connection string it gives you (starts `postgresql://`). Use the **pooled** connection string, not the direct one — Vercel's serverless functions open/close connections per-request, and pooling avoids exhausting Postgres's connection limit.
3. Keep this tab open — you'll paste it into Vercel and Fly shortly.

### 0.2 Redis on Upstash

1. Create a free account at upstash.com, create a Redis database in the same region you'll pick for Fly (Stage 2) to keep latency low.
2. Copy the **Redis URL** (the `rediss://...` one — note the extra `s`, meaning TLS. Both `ioredis` calls in this codebase already accept this transparently).

### 0.3 Run migrations against the online database

From your machine, point Prisma at the Neon URL once to create the schema:

```bash
DATABASE_URL="<your neon connection string>" npx prisma migrate deploy
```

`migrate deploy` (not `migrate dev`) — it applies existing migrations without prompting or trying to create new ones, which is what you want against a real database.

---

## Stage 1 — Next.js app on Vercel

### 1.1 Push the repo

Vercel deploys from a git repo, so this needs to be on GitHub/GitLab/Bitbucket first:

```bash
git init
git add .
git commit -m "fgc-stream through Phase 2"
git remote add origin <your repo URL>
git push -u origin main
```

### 1.2 Import into Vercel

1. vercel.com → **Add New → Project** → import the repo.
2. Framework preset: Vercel detects Next.js automatically — leave defaults.
3. **Before deploying**, add environment variables (Settings → Environment Variables), pulling values from `.env.example`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (Stage 0.1) |
| `REDIS_URL` | Upstash Redis URL (Stage 0.2) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | from your Clerk dashboard → **switch to production keys**, not the `pk_test_`/`sk_test_` ones you used locally |
| `CLERK_ENCRYPTION_KEY` | a random 32+ byte value, e.g. `openssl rand -hex 32`. Without this Clerk logs `Missing CLERK_ENCRYPTION_KEY` on every request in production and falls back to an in-memory key it regenerates on every cold start — harmless for a single always-warm instance, but on Vercel's serverless functions that means a different key per invocation, which can invalidate anything Clerk encrypted with the previous one. Not needed in local dev (`npm run dev` runs one long-lived process), only set this for the Vercel deploy. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | placeholder for now — you'll generate the real one in step 1.4, after you have a live URL to point Clerk at |
| `NEXT_PUBLIC_APP_URL` | leave blank for now; Vercel gives you the URL after first deploy, then come back and set it |
| `NEXT_PUBLIC_SOCKET_URL` | leave blank for now — filled in after Stage 2 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID` | not used yet (Phase 4), safe to leave as placeholders |

4. Click **Deploy**. First deploy will succeed but the app won't be fully wired yet (no socket URL) — that's expected, continue to Stage 2.

### 1.3 Note your Vercel URL

You'll get something like `https://fgc-stream.vercel.app`. Go back into Environment Variables and set `NEXT_PUBLIC_APP_URL` to this, then redeploy (Deployments → ⋯ → Redeploy) so it takes effect.

### 1.4 Point Clerk's webhook at the live URL

1. Clerk dashboard → **Webhooks** → **Add Endpoint**.
2. Endpoint URL: `https://<your-vercel-url>/api/webhooks/clerk`
3. Subscribe to `user.created`, `user.updated`, `user.deleted` (matches what `src/app/api/webhooks/clerk/route.ts` handles).
4. Clerk shows you a signing secret (`whsec_...`) — copy it into Vercel's `CLERK_WEBHOOK_SIGNING_SECRET` env var, then redeploy.

At this point the app stage is fully live, except the dashboard's live grid and watch pages will show no real-time updates yet — that's Stage 2.

---

## Stage 2 — Socket.IO server on Fly.io

### 2.1 Install and authenticate the Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2.2 Launch the app

From the project root (where `fly.toml` and `Dockerfile.socket` already are):

```bash
fly launch --no-deploy
```

- When it asks about an existing `fly.toml`, keep it.
- When it asks about a Postgres/Redis add-on: **decline both** — you're already using Neon and Upstash, and running a second Redis here would be redundant.
- Change the `app` name in `fly.toml` first if `fgc-stream-socket` is taken (Fly app names are globally unique).

### 2.3 Set secrets

```bash
fly secrets set REDIS_URL="<your upstash redis url>"
fly secrets set NEXT_PUBLIC_APP_URL="https://<your-vercel-url>"
```

(`NEXT_PUBLIC_APP_URL` is used by the socket server for its CORS `origin` check — see `src/server/socket/index.ts` — so it must match Vercel's URL exactly, including `https://`.)

### 2.4 Deploy

```bash
fly deploy
```

This builds `Dockerfile.socket` and runs it as an always-on machine (per `fly.toml`'s `min_machines_running = 1` — deliberately not auto-scaled to zero, since a WebSocket server going cold mid-tournament would drop every connected viewer).

### 2.5 Get the socket server's public URL

```bash
fly status
```

Note the hostname, something like `fgc-stream-socket.fly.dev`. The client connects over `wss://` (secure WebSocket), so the URL to use is:

```
https://fgc-stream-socket.fly.dev
```

(`socket.io-client`, used in `src/hooks/useSocket.ts`, upgrades `https://` to `wss://` automatically — you don't need to write `wss://` yourself.)

---

## Stage 3 — Connect the two stages

Go back to Vercel → Environment Variables → set:

```
NEXT_PUBLIC_SOCKET_URL=https://fgc-stream-socket.fly.dev
```

Redeploy the Vercel app one more time. Both stages are now talking to each other over the public internet instead of `localhost:3000`/`localhost:4000`.

---

## Verifying it worked

1. Visit your Vercel URL, sign in.
2. Open the browser dev tools → Network → WS tab. You should see a `websocket` connection to `fgc-stream-socket.fly.dev` with status `101 Switching Protocols`.
3. As an organizer, `PATCH` a match's score (via `/admin/tournaments/:id` once you have data seeded, or `curl` the endpoint directly) and confirm the dashboard's live grid updates without a page refresh — that round-trip (Vercel API route → Upstash Redis → Fly socket server → browser) is the thing this whole guide exists to stand up.

If the websocket connection fails: check that `NEXT_PUBLIC_SOCKET_URL` (Vercel) and `NEXT_PUBLIC_APP_URL` (Fly secret, used for CORS) are both set and match each other's actual domains exactly — this is the most common misconfiguration in a split deploy like this.

---

## What's still local-only after this guide

- `docker-compose.yml` (Postgres/Redis) is now unused for anything but a from-scratch local dev loop — feel free to keep using it for local development even though production points at Neon/Upstash.
- FFmpeg/ingest workers (Phase 3) aren't deployed anywhere yet — there's nothing to deploy until that phase exists.
- CI/CD (auto-deploy on push, migration checks, etc.) isn't set up — this guide is manual `git push` → Vercel autodeploy (that part's automatic once imported) and manual `fly deploy` for the socket server. Automating the Fly side is natural Phase 5 (CI/CD deliverable) scope.
