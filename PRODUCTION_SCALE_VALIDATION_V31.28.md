# FGC V31.28 — Production Scale & Reliability Validation

This phase hardens the existing product rather than adding another operator surface. The viewer experience, organizer workspace, tournament operations command center, and Control Room remain the product baseline.

## Validation gates

### Application
- [ ] lint and TypeScript pass
- [ ] unit tests pass
- [ ] integration tests pass against real Postgres
- [ ] production build passes
- [ ] E2E smoke tests pass against the exact deployed commit

### Auth and authorization
- [ ] viewer cannot access `/organizer` or platform `/admin`
- [ ] organizer can manage owned/authorized tournaments
- [ ] organization OWNER/ADMIN access matches the organization boundary
- [ ] platform ADMIN remains isolated from normal organizer permissions
- [ ] authenticated E2E coverage exercises these boundaries

### Billing
- [ ] Starter checkout completes in Stripe test mode
- [ ] Pro checkout completes in Stripe test mode
- [ ] Event Package payment completes without creating recurring subscription access
- [ ] signed webhook updates subscription state
- [ ] duplicate webhook is ignored
- [ ] failed webhook processing returns an error and remains retryable
- [ ] invoice payment failure produces `PAST_DUE`
- [ ] cancellation produces `CANCELED`
- [ ] Customer Portal opens for a configured customer
- [ ] live Stripe keys are enabled only after the complete test-mode cycle passes

### Streaming and realtime
- [ ] LiveKit connection/recovery tested in staging
- [ ] HLS playback survives player/network recovery
- [ ] Socket.IO reconnect resynchronizes state
- [ ] Redis outage does not break valid database mutations
- [ ] chat, reactions, presence and match updates remain correctly scoped
- [ ] YouTube quota/reuse/lease behavior is observed during a multi-station tournament

### Workers
- [ ] clip worker processes a representative media fixture
- [ ] clip failure is visible and retryable
- [ ] AI worker handles missing/invalid HUD calibration safely
- [ ] worker/queue outage produces an actionable degraded state

### Scale
- [ ] 25 VUs / 5 minutes
- [ ] 100 VUs / 10 minutes
- [ ] 500 VUs / 15 minutes
- [ ] 1,000+ VUs only after lower tiers pass
- [ ] Socket.IO connection/reconnect test run separately
- [ ] CDN/HLS media capacity tested separately from application HTTP capacity
- [ ] database CPU/connections/slow queries observed during every load tier

## Release rule

Do not treat CI success as proof of scale. Do not enable commercial billing until Stripe test-mode checkout, webhook, cancellation and portal flows are verified end-to-end. Do not treat AI comeback/perfect-round signals as authoritative until each supported game's HUD coordinates are calibrated against real captures.
