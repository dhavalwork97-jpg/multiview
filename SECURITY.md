# Security

## Authentication & authorization

- **Clerk** handles identity — password hashing, session management,
  brute-force protection on sign-in are Clerk's problem, not this repo's.
  A `users` table row is created/synced via a signature-verified webhook
  (`api/webhooks/clerk`), never trusting client-supplied identity data.
- **Role-based access** (`VIEWER < PLAYER < ORGANIZER < ADMIN`) is
  enforced **server-side, in every route handler that needs it**
  (`requireRole` in `src/lib/auth.ts`) — not just hidden in the UI.
  Middleware (`src/middleware.ts`) adds a second layer for whole route
  trees (`/admin/*`), but individual API routes don't rely on middleware
  alone; they check again themselves, since middleware's coarse
  path-matching is easy to get subtly wrong for mixed-access routes
  (e.g. `/api/matches` is GET-public, POST-organizer-only on the same
  path).

## Webhook verification

Every inbound webhook verifies a cryptographic signature before trusting
its payload — Clerk (`svix`), Stripe (`stripe.webhooks.constructEvent`),
LiveKit (`WebhookReceiver`). None of them are trusted based on source IP
or URL obscurity alone, which is the failure mode that matters here:
anyone who discovers a webhook URL should still be unable to forge
events without the signing secret.

## Input validation

Every route handler that accepts a body validates it with **Zod**
against an explicit schema before it touches the database — malformed
input gets a `400` with the specific validation failure, not a `500`
with a stack trace (which would leak implementation details) or, worse,
a query built from unvalidated input. Prisma parameterizes every query
it builds, so classic SQL injection isn't a realistic vector here as
long as no route drops to raw SQL — none currently do.

## Rate limiting

Added this phase (`src/lib/rate-limit.ts`), applied to the two
highest-risk endpoints:

- **Search** (`/api/search`) — public, no auth required, so it's rate
  limited per-IP (20 req/10s) rather than per-user.
- **Clip creation** (`/api/clips` POST) — cheap to request, expensive to
  fulfill (an FFmpeg job on a separate worker), rate limited per-user
  (5/min) so one person can't starve the clip worker for everyone during
  a hype match.

**Not yet applied everywhere it arguably should be** — the station
assignment and score-update endpoints are organizer-only (smaller,
trusted population) and weren't prioritized this pass; worth adding if
the organizer population ever grows past "people you'd trust with admin
access anyway."

## Security headers (`next.config.ts`)

`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security` with `preload`, a `Content-Security-Policy`
that explicitly allow-lists exactly the external origins the app
actually talks to (CloudFront for video, the Socket.IO server, the
LiveKit WebRTC endpoint) rather than a permissive wildcard. Verified by
a real E2E test (`tests/e2e/security-headers.spec.ts`) against a live
deployment, not just a config-shape unit test — headers only matter if
the hosting platform actually applies them.

## Secrets

- Nothing is committed — `.env.example` documents every variable's
  *name* and *shape*, never a real value.
- IAM scoping: the S3 credentials used by Egress and the clip worker are
  scoped to `PutObject`/`GetObject` on exactly the two buckets they need
  (`PHASE3_DEPLOYMENT_GUIDE.md` Stage A.3) — not broad S3 access.
- LiveKit's viewer tokens are subscribe-only and short-lived (`ttl: "6h"`,
  `src/lib/livekit.ts`) — a leaked viewer token can't be used to publish
  fake video into a station's room.
- Station stream keys are rotated (old ingress deleted, new one issued)
  every time `POST /api/stations/:id/ingress` is called, rather than
  reused — limits the blast radius of a leaked key to "until someone
  notices and re-issues," not "forever."

## Dependency scanning

- **Dependabot** (`.github/dependabot.yml`) — weekly PRs for npm,
  Docker base images, and GitHub Actions versions, with minor/patch
  bumps grouped into one PR rather than a dozen separate ones.
- **CodeQL** (`.github/workflows/codeql.yml`) — static analysis on every
  push/PR plus a weekly scheduled run, so a vulnerability pattern
  disclosed after code merges still gets caught.

## Honest gaps

- **No WAF / DDoS layer in front of the app.** Vercel and CloudFront both
  have some baked-in protection, but nothing here is a deliberate,
  configured defense (e.g. Cloudflare in front, or AWS Shield on
  CloudFront) — worth adding before this handles a genuinely high-profile
  public event.
- **No secrets manager.** Env vars live in each platform's own dashboard
  (Vercel/Render/Fly/EC2's `docker compose` env), which is fine at this
  scale but doesn't give centralized rotation or audit logging the way
  AWS Secrets Manager or Doppler would.
- **No automated penetration testing or dependency audit beyond
  Dependabot/CodeQL** — no `npm audit` gate in CI, no scheduled DAST scan.
  Adding `npm audit --audit-level=high` as a CI check is a small, worthwhile
  next step that isn't in yet.
- **Rate limiting isn't applied to every mutating endpoint** — see above.
- **No documented incident response process** — who gets paged, how a
  leaked key gets rotated across all six deployed stages, what the
  rollback procedure is for a bad migration. This is a real gap for a
  platform that will, eventually, have a real production incident.
