# FGC V31.29 — Launch Hardening & Real-Environment Validation

Phase 20 is the final launch-hardening layer over the existing viewer, social, organizer, tournament operations, Control Room, streaming and billing product. It does not add another operator surface.

## Automated gates

- lint and TypeScript pass
- unit and integration tests pass
- production build passes
- health/readiness contracts pass
- unauthenticated access cannot expose organizer or platform-admin sessions
- E2E runs against the exact deployed commit
- CodeQL and dependency security audit pass

## Real-environment gates

### Authentication and RBAC
- authenticated viewer can reach viewer surfaces but not organizer/platform admin surfaces
- organizer can manage owned or authorized tournaments
- organization OWNER/ADMIN boundaries are enforced
- platform ADMIN remains isolated

### Billing
- Stripe test-mode Starter, Pro and Event Package checkout succeeds
- signed webhook updates state and duplicate delivery is idempotent
- failed webhook processing returns an error so Stripe can retry
- payment failure/cancellation transitions are verified
- Customer Portal works for a configured customer
- live billing is enabled only after the complete test-mode cycle passes

### Streaming and realtime
- LiveKit reconnect/recovery verified in staging
- HLS playback recovers from network/player interruption
- Socket.IO reconnect and state resync verified
- Redis failure leaves valid database mutations usable
- YouTube quota, broadcast reuse and station lease behavior observed under a multi-station tournament

### Workers and AI
- clip worker success and retry paths verified with a representative fixture
- queue outage produces an actionable degraded state
- AI safely handles missing or invalid HUD calibration
- supported-game HUD coordinates are calibrated against real captures before AI signals are treated as authoritative

### Scale
- application load: 25, 100, 500 VUs, then 1,000+ only after lower tiers pass
- Socket.IO connection/reconnect load tested separately
- CDN/HLS media capacity tested separately from application HTTP
- database CPU, connections and slow queries observed during each tier

## Release rule

A green CI pipeline proves code correctness, not production capacity. Commercial billing and AI-derived competitive signals remain disabled or non-authoritative until their respective real-environment gates pass. Record every staging/production validation result with the deployed commit SHA.
