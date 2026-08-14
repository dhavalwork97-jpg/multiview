# FGC Stream — Production Hardening V9

This release completes the remaining reliability gaps explicitly identified in the project architecture/security/testing documents.

## Included

1. **Operator-triggered egress reconciliation**
   - `POST /api/tournaments/:tournamentId/reconcile-egress` checks LiveKit only when an authorized operator asks for repair.
   - LIVE stations with missing playback are retried through the existing idempotent egress path.
   - Every reconciliation is audit logged.

2. **Dedicated clip realtime event**
   - Clip workers now publish `clip:ready` instead of pretending a clip is a match score update.
   - Socket.IO routes the event to the affected match room and tournament room.

3. **Mutation rate limiting**
   - Match status/score mutations, station assignment and egress reconciliation use the existing Upstash limiter.
   - This protects operator endpoints from accidental double-click storms and scripted abuse.

4. **Control Room incident handling**
   - Active incidents are visible directly in the Control Room.
   - Operators can acknowledge and resolve incidents without leaving the event workspace.

5. **Load-test and security automation**
   - Added `loadtest/k6-public-event.js` for staged public-event/metrics load tests.
   - Added a CI `npm audit --audit-level=high` gate.

6. **Incident response runbook**
   - Added `INCIDENT_RESPONSE.md` covering quota exhaustion, playback repair, credential exposure, database P1001, and rollback.

## Deliberately not faked

The project architecture still identifies multi-rendition HLS encoding and signed media URLs as infrastructure/product upgrades rather than pretending a single-rendition public stream has those properties. They should be implemented when the deployment is ready for private/pay-per-view media rights, because doing them superficially would make the current public streaming path less reliable.
