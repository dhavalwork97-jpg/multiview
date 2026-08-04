# Testing strategy

Three layers, each catching what the layer below it structurally can't.

## 1. Unit tests (`tests/unit/`, `npm run test`)

Pure logic, no DB, no network. What's covered:

- `billing.ts` — `isPremium`/`maxMultiViewTiles`, the two functions every
  paywall check in the app calls. If these are wrong, either free users
  get Premium features for free or paying subscribers get locked out —
  worth having pinned down precisely.
- The Stripe webhook's status mapper — the single translation from
  Stripe's subscription states to ours; a silent bug here means a
  canceled subscriber keeps Premium access indefinitely.
- The HP-bar color heuristic (`game-hud-config.ts`) — cheap to get
  a false sense of confidence about without a test, since a color
  threshold that's subtly wrong doesn't crash, it just quietly produces
  bad hype scores.
- The CDN URL builder — one bug here breaks every video on the platform,
  so it's tested even though it's a two-line function.

Runs in a few seconds, no external services — this is the layer that
should run on every keystroke in local dev (`npm run test:watch`).

## 2. Integration tests (`tests/integration/`, `npm run test:integration`)

Real Prisma queries against a real (throwaway) Postgres, calling Next.js
route handlers directly as functions — no server process needed, since
App Router route handlers are just `(req: Request) => Response`.

What this layer is for: proving auth/role enforcement actually works
against real data (a VIEWER really can't create a match; a signed-out
request really gets rejected before touching the DB) and that Zod
validation rejects malformed input with a 400 instead of leaking a 500
with a stack trace. See `tests/integration/README.md` for the honest list
of what this layer explicitly doesn't cover (anything requiring a real
webhook sender or a running socket server) and why that's a deliberate
boundary, not an oversight.

## 3. E2E tests (`tests/e2e/`, `npm run test:e2e`, Playwright)

Runs against a **real deployed URL** — a Vercel preview deployment in
CI, triggered by Vercel's own `deployment_status` webhook event
(`.github/workflows/e2e.yml`) — never a local dev server. This is the
only layer that can actually prove: the real Clerk middleware redirects
correctly, the real security headers (`next.config.ts`) land on real
responses, a 404 is a real 404 and not a Next.js dev-mode error overlay
papering over a broken route.

## What's honestly not covered yet

Being direct about the gaps rather than implying full coverage:

- **No test touches the LiveKit webhook, Stripe webhook, or the AI/clip
  workers.** These need a real signed webhook payload or a real FFmpeg
  process against a real video file — worth building (webhook payload
  fixtures + signature generation is the standard approach), just not
  built yet. Currently this is the single biggest coverage gap.
- **No load testing.** The original ask ("1000 concurrent streams,
  100,000 viewers") is an infrastructure capacity claim, and nothing in
  this repo has actually verified it under load. A k6 or Artillery
  script hitting the HLS/CloudFront path and the Socket.IO server with
  synthetic concurrent viewers is the natural next addition — flagged
  as not done rather than assumed fine because the architecture doc
  says it should scale.
- **No Clerk test-session wiring in E2E**, so every E2E test here is
  necessarily an unauthenticated flow. Clerk supports test tokens for
  exactly this; wiring it in is real remaining work.
- **Multi-arch/ARM testing for the Oracle deployment path** — CI builds
  and tests on amd64 only; nothing here specifically verifies the arm64
  Docker builds work, beyond LiveKit's own images being documented as
  multi-arch.
