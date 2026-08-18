# FGC Stream

Every tournament station, live, individually watchable.

**Deploying this from scratch? Start with `SETUP_GUIDE.md`** — it's the
single ordered walkthrough from `git push` through all six live stages,
including the full environment variable reference and GitHub Actions
secrets that are otherwise scattered across the individual per-stage
guides (`DEPLOYMENT_GUIDE.md`, `PHASE3_DEPLOYMENT_GUIDE.md`,
`RENDER_DEPLOYMENT.md`, `ORACLE_FREE_TIER_DEPLOYMENT.md`). Everything
below is the phase-by-phase build log.

---

# Phase 1

This phase lays the
foundation everything else builds on: project scaffold, data model, auth,
and a basic organizer dashboard with a live match grid (polling-backed
placeholder for now — real video and push updates come in later phases).


## Tournament Control Room

Organizers now have a dedicated multi-station control room at `/admin/tournaments/<tournamentId>/control-room`. It is the primary operations surface for running multiple OBS → YouTube stations: create stations, assign queued matches, start/end matches, retrieve per-station OBS credentials, open the active YouTube broadcast, and monitor YouTube/heartbeat health.

## What's in this phase

- **Project setup** — Next.js 15 (App Router) + TypeScript + Tailwind, Prisma, Clerk, package.json with the full Phase-1-relevant dependency set pinned.
- **Folder structure** — see below.
- **Database schema** — `prisma/schema.prisma`: users, players, tournaments, entrants, brackets (JSON topology + relational matches), stations, matches, watch history, favorites.
- **Authentication** — Clerk, with a webhook (`/api/webhooks/clerk`) that mirrors Clerk users into our `users` table, middleware-based route protection, and a `requireRole` helper for API-level RBAC (`VIEWER < PLAYER < ORGANIZER < ADMIN`).
- **Basic dashboard** — `/dashboard`: signed-in organizer sees their tournaments and a live grid of currently-live matches.
- **Live match data model** — `Match` + `Station` + `Bracket`, wired to two API routes (`GET/POST /api/matches`, `GET/POST /api/stations`) that back the grid and the (future) organizer assignment UI.

## Folder structure

```
fgc-stream/
├── docker-compose.yml          # local Postgres + Redis
├── .env.example
├── package.json
├── tailwind.config.ts
├── prisma/
│   └── schema.prisma
└── src/
    ├── middleware.ts            # Clerk route protection + organizer gating
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── (auth)/sign-in/[[...sign-in]]/page.tsx
    │   ├── dashboard/page.tsx
    │   └── api/
    │       ├── matches/route.ts
    │       ├── stations/route.ts
    │       ├── tournaments/         # stubbed, Phase 2
    │       └── webhooks/
    │           ├── clerk/route.ts
    │           └── stripe/          # stubbed, Phase 4 (billing)
    ├── components/
    │   └── dashboard/
    │       ├── MatchCard.tsx
    │       └── LiveGrid.tsx
    ├── lib/
    │   ├── db.ts                 # Prisma client singleton
    │   └── auth.ts                # getCurrentUser / requireRole
    ├── server/
    │   ├── socket/                # Socket.IO server, Phase 2
    │   └── streaming/             # ingest/FFmpeg orchestration, Phase 3
    └── types/
```

## Design direction (dashboard/grid)

Near-black broadcast-booth background (`arena-950`), with the universal
fighting-game player-corner convention as the accent system: crimson for
P1, electric blue for P2, on every match card. Scores and station labels
use a mono face so they read like a scoreboard. A signature diagonal
corner-cut (`.bezel-cut`) on each card nods to a stage screen bezel rather
than a generic rounded rectangle. Full token list in `tailwind.config.ts`.

## Running locally

```bash
cp .env.example .env        # fill in Clerk keys at minimum
docker compose up -d        # Postgres + Redis
npm install
npm run prisma:migrate
npm run dev
```

Visit `/dashboard` after signing in. Note: `role` on `User` defaults to
`VIEWER` — to test the organizer flow, set a user's role to `ORGANIZER`
directly in the DB (Prisma Studio: `npm run prisma:studio`) until the
Phase 2 admin role-management UI exists.

## Deliberately deferred to later phases (as of Phase 1)

- Real video: WebRTC/WHIP ingest, HLS fallback, FFmpeg transcoding, S3/CloudFront — **Phase 3**.
- Multi-view, clip generation, DVR, instant replay — **Phase 3**.
- AI hype/comeback/perfect-round detection and highlight generation — **Phase 4**.
- Stripe subscriptions — **Phase 4**.
- Full Docker Compose (app + socket + FFmpeg workers + SFU), AWS architecture doc, CI/CD, test suite, security hardening pass — **Phase 5 (deployment/ops)**.

---

## Phase 2 — real-time, brackets, search, station assignment

### What's new

- **Socket.IO server** (`src/server/socket/index.ts`) — standalone process, run with `npm run socket:dev`. Uses the Redis Socket.IO adapter so it can run as multiple instances behind a load balancer, and subscribes to a Redis pub/sub channel (`src/lib/events.ts` / `src/lib/redis.ts`) that Next.js API routes publish to. This is what lets stateless Next.js instances and the long-lived socket tier scale independently. Rooms: `tournament:{id}` (grid-level updates), `match:{id}` (single-match viewers, including live viewer counts computed from room membership).
- **`LiveGrid` now push-based**, not polling — initial REST snapshot, then `match:updated` events over the socket keep it current, with a re-sync fetch on reconnect.
- **`PATCH /api/matches/:matchId`** — the score-keeper write path (score, status, winner), auto-stamps `startedAt`/`endedAt`, publishes `match:updated`.
- **`POST /api/matches/:matchId/assign`** — assigns a queued match to a station, checked against double-booking a station that already has a live match, publishes `match:assigned`.
- **Bracket import** (`POST /api/brackets`) — accepts an already-normalized bracket payload (rounds → slots → player ids); stores the layout as JSON (source-agnostic — start.gg/Challonge/manual all fit the same shape) and creates real relational `Match` rows for any slot where both players are already known. `GET /api/brackets/:id` enriches that structure with live Match state and a `playerId -> live matchId` map.
- **`InteractiveBracket`** — renders rounds as columns; clicking a player jumps straight to `/watch/:matchId` if they're currently live, clicking a station badge does the same.
- **`/watch/:matchId`** — placeholder watch page (real player is Phase 3), but fully wired to the match's socket room for live score/status/viewer count, so every click-through added this phase has a real destination.
- **Search** (`GET /api/search`) — players/stations/tournaments in one debounced call, surfaced via `SearchBar` in the dashboard header.
- **`StationAssignmentBoard`** — organizer view pairing queued matches against station health (heartbeat staleness, bitrate, dropped frames), refreshed on `station:status`/`match:assigned` pushes rather than polling. Lives at `/admin/tournaments/:id` alongside the bracket view.

### Running Phase 2 locally

Same as Phase 1, plus the socket server needs to be running:

```bash
npm run socket:dev   # separate terminal — the real-time tier
npm run dev
```

Set `NEXT_PUBLIC_SOCKET_URL` in `.env` if the socket server isn't on `localhost:4000`.

---

## Phase 3 — streaming architecture

Full writeup in `STREAMING_ARCHITECTURE.md`, deploy steps in
`PHASE3_DEPLOYMENT_GUIDE.md`. Short version: **HLS via CloudFront is the
default viewing path (scales to any audience), WebRTC is opt-in
low-latency mode** — a WebRTC SFU doesn't cheaply fan out to 100k
viewers, a CDN does. Media server is self-hosted **LiveKit**
(Ingress/SFU/Egress) rather than hand-rolled FFmpeg orchestration; one
egress job per live match produces both the HLS playlist and the full
MP4, which is what makes auto-recording, DVR, and instant-replay clips
fall out of one mechanism instead of three. Four deployable stages by
the end of this phase: Next.js (Vercel), Socket.IO (Fly), **LiveKit
media server (AWS EC2 — needs direct UDP reachability no PaaS gives
you)**, and the FFmpeg clip worker (Fly).

## Phase 4 — AI features + Stripe subscriptions

### AI: what's real vs. what needed a caveat

There's no game API exposing round/HP data from a PS5 — anything
"AI-detected" here is read off the video feed:

- **HP-bar reading** (`src/server/ai/hp-bar-reader.ts`) — FFmpeg crops
  each player's health-bar region from a live frame, scales it to one
  pixel tall, and a Node buffer scan finds where "bar" pixels stop.
  Needs real per-game pixel coordinates in `game-hud-config.ts` — shipped
  with placeholder coordinates and a loud comment saying so, not
  pretending they're calibrated.
- **Crowd loudness** (`crowd-signal.ts`) — FFmpeg's `ebur128` filter on a
  short audio sample, a genuinely weak standalone signal (crowd mic
  bleed, commentary, and game SFX all look the same) — used as one input
  to a weighted score, not a standalone detector.
- **`hype-worker.ts`** — the fifth deployable stage (Fly or Render, same
  pattern as the clip worker). Polls every live match every 5s, combines
  score-closeness + HP tension + crowd loudness into `Match.hypeScore`,
  and detects **comebacks** (a player was critically low, then won a
  round) and **perfect rounds** (a round won while the opponent's bar
  stayed ~full) by diffing HP readings against score changes over time.
- **Auto highlight generation** — a detected comeback/perfect round
  enqueues a clip through the exact same Phase 3 clip pipeline a viewer's
  manual click uses (`createdById: null`, exactly what `Clip`'s Phase 3
  schema comment already reserved for this).
- **Most exciting matches ranking** (`GET /api/matches/trending`) — an
  `ORDER BY hypeScore`, no separate ranking system.
- **Recommendations** (`GET /api/recommendations`) — favorited players
  live now, then trending matches not yet watched. No ML model — that
  needs viewing-pattern volume this platform won't have until it's run
  real tournaments; noted as the honest v1 rather than overbuilt.

### Stripe

`POST /api/billing/checkout` / `POST /api/billing/portal` +
`POST /api/webhooks/stripe` (the single writer of
`User.subscriptionStatus` — never trust the client or a redirect URL for
this). `src/lib/billing.ts` is the one place Premium's actual perks are
defined: WebRTC low-latency mode and 9-tile multi-view (vs. 4-tile free)
— both gated because they're the higher-infra-cost viewing paths from
Phase 3, not gated arbitrarily.

### Deploying without a credit card

Fly.io requires a card now (they cut free allowances for new signups in
2024). Added `render.yaml` + `RENDER_DEPLOYMENT.md` as a no-card
alternative for the socket server, clip worker, and this phase's AI
worker — Fly configs are kept as documented alternatives. The LiveKit
media server stays on EC2 regardless of which platform runs everything
else; neither PaaS exposes the UDP port range WebRTC needs.

### What's honestly still missing

- Favorite-player **notifications** ("notify me when they go live") —
  the `Favorite` model exists and recommendations use it, but there's no
  push/email delivery mechanism yet.
- Multi-rendition adaptive bitrate (carried over from Phase 3).
- HUD coordinates in `game-hud-config.ts` are placeholders, not measured
  against real captures — comeback/perfect-round detection won't be
  trustworthy until someone calibrates them per game.
- The clip worker's `match:updated` piggyback for clip-ready
  notifications (flagged in Phase 3) is still unsplit.

---

## Phase 5 — CI/CD, testing, security hardening

### CI/CD (`.github/workflows/`)

- **`ci.yml`** — lint, typecheck, unit tests, and integration tests (real
  Postgres via a GitHub Actions service container, not mocked) on every
  push/PR, then a build-compiles check gated on all three passing.
- **`deploy-migrations.yml`** — `prisma migrate deploy` against
  production as its own visible step (not silently folded into Vercel's
  build), triggered only on schema/migration file changes, runnable
  behind a GitHub Environment protection rule if you want a human
  approval gate before a schema change hits the real database.
- **`deploy-media-server.yml`** — the one stage that isn't behind a
  platform that redeploys on push: SSHes into the EC2/Oracle box and
  restarts the LiveKit `docker compose` stack when `infra/livekit/`
  changes.
- **`deploy-fly-workers.yml`** — only relevant if you went the Fly route
  instead of Render for the socket/clip/AI worker services; Render
  redeploys those automatically via its own native GitHub integration,
  no workflow needed on this repo's side for that path.
- **`e2e.yml`** — triggers off Vercel's own `deployment_status` webhook
  event once a preview deploy finishes, then runs Playwright against
  that real URL — never a local server.
- **`codeql.yml`** + **`dependabot.yml`** — static analysis on every
  push/PR plus weekly, and weekly grouped dependency-update PRs across
  npm/Docker/Actions.

### Testing (`TESTING_STRATEGY.md`)

Three layers, each catching what the one below structurally can't: unit
tests for pure logic (premium gating, the Stripe status mapper, the
HP-bar color heuristic), integration tests calling real Next.js route
handlers against a real throwaway Postgres (auth/role enforcement, input
validation), and Playwright E2E against a real deployed preview URL
(real Clerk middleware, real security headers). Documented honestly:
**no test yet touches the LiveKit/Stripe webhooks or the FFmpeg workers**
directly, and there's no load test backing the "100,000 viewers" capacity
claim — both flagged as the real remaining gaps, not glossed over.

### Security (`SECURITY.md`)

Consolidates what was already true across earlier phases (webhook
signature verification, Zod validation on every route, scoped IAM,
short-lived subscribe-only LiveKit tokens, stream-key rotation on
re-issue) and adds what was missing: rate limiting on the two
highest-risk endpoints (public search, clip creation — the one that's
cheap to request and expensive to fulfill), a real `Content-Security-Policy`
scoped to exactly the origins this app talks to, and CodeQL +
Dependabot. Also fixed a small inconsistency from Phase 3: removed an
env var (`LIVEKIT_WEBHOOK_SIGNING_SECRET`) that was documented but never
actually used — webhook verification runs off `LIVEKIT_API_SECRET`,
which was already there.

**Honest gaps, not glossed over:** no WAF/DDoS layer, no centralized
secrets manager, no `npm audit` CI gate yet, and no documented incident
response process. All listed explicitly in `SECURITY.md` rather than
implied to be handled.

---

This closes out the five phases originally scoped. What exists now: a
working platform through Phase 4's feature set, six independently
deployable online stages (Vercel, socket server, LiveKit media server,
clip worker, AI worker, plus Neon/Upstash/S3/CloudFront as managed
services), automated on every push, with a real (if incomplete, and
documented as such) test and security posture behind it.


## Organizer Operations

V7 adds the organizer operations foundation: role policies, event setup checklist, incident contracts, and an operations page at `/admin/tournaments/[tournamentId]/operations`. These additions are deliberately additive and do not invent a new persistence schema.

## V27 Universal Competition Layer

V27 adds a format-neutral standings engine and operator standings workspace. Completed generic Side A / Side B matches now produce standings for individual competitors, teams, pairs and mixed participant groups. The rules snapshot can define win/draw/loss points, while score-for/against and differential provide generic secondary ranking data.

Public standings: `/tournaments/:tournamentId/standings`
Operator standings: `/admin/tournaments/:tournamentId/standings`
Standings API: `/api/tournaments/:tournamentId/standings`
