# Integration tests

These run real Prisma queries against a real (throwaway) Postgres — not
mocks — and call Next.js route handlers as plain functions (`GET`/`POST`
exports take a `Request` and return a `Response`; App Router route
handlers don't need a running server to test).

## Running locally

```bash
docker run -d --name fgc-test-db -p 5433:5432 -e POSTGRES_PASSWORD=test -e POSTGRES_DB=fgc_test postgres:16-alpine
DATABASE_URL="postgresql://postgres:test@localhost:5433/fgc_test" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:test@localhost:5433/fgc_test" npm run test:integration
```

CI does the equivalent via a GitHub Actions service container — see
`.github/workflows/ci.yml`.

## What's covered vs. not

Covered: request validation (bad input correctly rejected before
touching the DB), auth/role enforcement (a VIEWER can't hit organizer-only
writes), and the shape of successful responses against real Prisma
relations.

**Not covered, and worth being honest about:** Socket.IO event delivery,
LiveKit webhook handling, Stripe webhook handling, and the FFmpeg-based
workers (clip cutting, HP-bar reading) — these all depend on external
services (a running socket server, a real LiveKit/Stripe webhook sender,
real video files) that don't fit cleanly into "spin up Postgres and call
a function." Test coverage for those lives at the E2E layer (a real
click sends a real request through the whole stack against a staging
deploy) rather than integration — see `tests/e2e/` and
`TESTING_STRATEGY.md` for why that trade-off was made rather than
mocking three different webhook senders.
