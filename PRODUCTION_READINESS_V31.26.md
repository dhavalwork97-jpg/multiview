# FGC V31.26 — Production Readiness

Phase 17 is a release-readiness pass, not a new control-room replacement. Phase 14–16 product surfaces remain the baseline.

## Release gates

### Product journeys
- Viewer discovery, live watch, multiview, chat, reactions, presence, watch parties and favorites work together.
- Organizer can create/configure a tournament, manage competitors, stations and matches, operate the Control Room, and reach reporting/analytics surfaces.
- Viewer accounts cannot enter organizer/admin operations surfaces.
- Organizer accounts cannot enter platform-admin-only surfaces.

### Tournament lifecycle
- Draft/setup/live/completed transitions do not strand matches or stations.
- Match assignment prevents station double-booking.
- Match completion publishes the expected realtime state and preserves timestamps.
- Bracket progression and public match state remain consistent after reconnects.
- Incidents and operator activity remain attributable to the tournament.

### Streaming
- YouTube provisioning is quota-budgeted and concurrent provisioning is lease-protected.
- Reusable station broadcasts remain isolated by station.
- Match pages only expose the stored broadcast for the active match state.
- HLS/WebRTC recovery paths fail safely when optional realtime infrastructure is unavailable.

### Realtime
- Socket reconnects trigger state resynchronization.
- Redis failures do not turn otherwise-valid database mutations into failures.
- Chat, reactions, presence and match/station updates are scoped to the correct room.

### Observability
- `/api/health` reports database and Redis health without caching.
- `/api/ready` provides a database-backed readiness signal without exposing secrets.
- Organizer operations have an audit trail.
- Production failures are represented as actionable degraded/error states rather than false-positive healthy states.

### Automated validation
- Lint and TypeScript typecheck pass.
- Unit tests pass.
- Integration tests run against real Postgres in CI.
- E2E smoke tests run against the exact deployed preview commit.
- CodeQL and dependency security checks pass.
- Production build passes before merge.

## Known launch blockers to resolve before commercial scale

- Run representative concurrent-viewer load tests; CI success is not a capacity claim.
- Exercise LiveKit, Stripe webhooks, FFmpeg/clip workers and other external-service failure modes in a staging environment.
- Calibrate per-game HUD coordinates before treating AI comeback/perfect-round detection as authoritative.
- Enable Stripe only after live/test-mode checkout, webhook, cancellation and portal flows have been verified end-to-end.
