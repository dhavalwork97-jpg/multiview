# FGC Stream V4 — Operations Health Center

## What changed

This upgrade adds a production-oriented diagnostics layer to the Tournament Control Room.

### New health endpoint

`GET /api/tournaments/:tournamentId/health`

The endpoint is organizer/admin protected and performs no YouTube API calls. It reports:

- Database reachability
- Redis realtime configuration
- YouTube OAuth configuration
- Clerk authentication configuration
- Stripe billing configuration
- Application-side YouTube quota safety budget
- Current quota lockout state

The endpoint intentionally reports configuration state rather than secret values.

### Control Room

The control room now displays a **System Health / Control Plane Diagnostics** section. This gives an event operator a quick indication of whether the application itself is ready before troubleshooting a station or match.

Health data is refreshed alongside the existing control-room refresh cycle. It does not poll YouTube and therefore does not consume YouTube API quota.

## Why this matters for a sellable product

The control room should distinguish:

1. a venue/encoder problem,
2. an application/database problem,
3. a missing infrastructure configuration, and
4. a YouTube quota problem.

That reduces operator confusion and makes support incidents easier to diagnose.

## Deployment

No new Prisma migration is required for V4. The V3 migrations are still required:

```bash
npx prisma migrate deploy
```

Then verify:

```bash
npm run typecheck
npm run build
```
