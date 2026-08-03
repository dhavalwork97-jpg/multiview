# FGC Stream — Phase 1

Every tournament station, live, individually watchable. This phase lays the
foundation everything else builds on: project scaffold, data model, auth,
and a basic organizer dashboard with a live match grid (polling-backed
placeholder for now — real video and push updates come in later phases).

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

### Next up: Phase 3 proposal

Streaming architecture: WHIP/RTMP ingest, FFmpeg transcode pipeline, HLS
packaging to S3/CloudFront, the actual WebRTC low-latency player wired
into the watch page, multi-view (4/9-stream layout), auto-recording, clip
generation, and DVR. Let me know if you'd like to adjust that scope before
I start.
