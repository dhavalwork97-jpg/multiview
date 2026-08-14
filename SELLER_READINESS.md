# FGC Stream — Seller Readiness

## Product promise
A tournament operator can create an event, register physical stations, assign a different match to each station, stream each station to its own unlisted YouTube session, watch individual matches from the website, and advance brackets without manually editing the database.

## Reliability controls
- Start/end match transitions are idempotent.
- A station cannot host two LIVE matches at once.
- YouTube broadcasts are station-scoped and reused across matches on that station.
- YouTube polling is not used by dashboards or viewers, protecting daily quota.
- A reconciliation action repairs stale provisioning locks and impossible local station state without calling YouTube.
- Audit logs capture operator actions.

## Bracket engine
- Existing single-elimination imports retain automatic winner advancement.
- Imported structures may define `winnerTarget` and `loserTarget` pointers for double elimination.
- Match rows are created only when both player slots are known.

## Operations
- Control Room has station health, quota health, event report, and reconciliation controls.
- Event report exposes match totals, completion rate, average match duration, station performance, dropped frames, and audit-event volume.

## Before selling
1. Connect a production Google/YouTube account and verify Live Streaming eligibility.
2. Configure Clerk, database, Redis, Stripe, and production URLs.
3. Run a full multi-station event rehearsal with at least two simultaneous streams.
4. Test recovery: refresh, duplicate Start, duplicate End, deployment restart, and stale provisioning lock.
5. Test a single-elimination bracket end-to-end and a double-elimination structure with explicit target pointers.
