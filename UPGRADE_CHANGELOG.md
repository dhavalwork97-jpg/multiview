# FGC Stream — reliability/commercial hardening pass

## Implemented

### 1. YouTube quota protection
- Added an application-side daily YouTube write budget (`YOUTUBE_DAILY_QUOTA_BUDGET`, default 3000 units).
- Every expensive YouTube write is reserved before the request is sent.
- `quotaExceeded` / `dailyLimitExceeded` responses block further YouTube writes until the next UTC day instead of retrying into the exhausted quota.
- Added an admin-only `/api/admin/youtube-quota` endpoint to inspect today's application-side budget.
- Normal viewer/status calls remain DB-only and do not call YouTube.

### 2. Duplicate broadcast protection
- Added a short-lived database provisioning lease on each station.
- Concurrent Start requests cannot create duplicate broadcasts for the same station.
- A crashed provisioning request cannot permanently lock a station; the lease expires after two minutes.

### 3. Multi-station isolation
- YouTube stream credentials remain station-scoped and reusable.
- The current YouTube broadcast/video remains station-scoped.
- Match rows keep their own broadcast/video IDs.
- A station cannot start a second LIVE match while another match is LIVE there.
- Different stations can run different matches concurrently.
- Watch pages only render the match's stored video while that match is LIVE, so an old match page does not silently switch to the station's next match.

### 4. Unlisted website-first broadcasting
- New broadcasts are created with `privacyStatus: unlisted`.
- `enableEmbed: true` remains enabled so the website is the intended viewing surface.

### 5. Redis hardening
- Localhost Redis is no longer silently selected in production API code.
- Realtime publishing is fail-safe: a Redis outage cannot roll back a successful DB match/bracket mutation.
- Upstash REST rate limiting fails open in local builds when credentials are intentionally absent, avoiding noisy build-time warnings.
- The clip queue requires `REDIS_URL` when actually used in production.

### 6. Bracket progression preservation
- Existing winner-to-next-round progression remains intact and idempotent.
- Match completion remains the single trigger for bracket advancement.
- The existing roundIndex/matchIndex mapping is preserved.

## Required production migration

Run:

```bash
npx prisma migrate deploy
```

This adds:
- `stations.youtubeProvisioningAt`
- `youtube_quota_ledger`

## Required environment variable

Recommended:

```env
YOUTUBE_DAILY_QUOTA_BUDGET=3000
```

Keep `REDIS_URL`, Clerk production variables, and the existing YouTube OAuth variables configured in the deployed environment.

## Important operational rule

Do not add background YouTube polling just to display LIVE status. The application deliberately keeps viewer status DB-driven to protect quota. The YouTube iframe itself is the final playback authority.

### 7. Operator transition safety
- Starting a match now always uses the station-scoped YouTube provisioning/reuse path instead of trusting a historical match YouTube ID.
- Completed matches cannot be accidentally restarted as LIVE.
- A station YouTube session cannot be ended while a match on that station is still LIVE.
- These checks prevent stale match IDs and operator clicks from producing a website match that points at an ended or unrelated stream.

### 8. Operator audit trail
- Added an append-only `audit_logs` table for important organizer/admin actions.
- Tournament creation, station creation, match transitions, and station YouTube-session shutdowns are recorded.
- Audit writes are best-effort and never cause a successful operational mutation to fail.
- Added `GET /api/tournaments/:tournamentId/activity` for the control room and future reporting/incident tooling.

## Upgrade Batch — #1 to #5 (2026-08-14)

### 1. Production RBAC hardening
- Added explicit tournament read/manage/admin authorization helpers.
- Organization VIEWER is read-only; OPERATOR/ADMIN/OWNER can operate.
- Protected bracket imports and station egress retry with tournament-scoped organization authorization.
- Read-only control-room/health/report/metrics/activity access now supports organization viewers.

### 2. Control Room 2.0
- Added consolidated `/api/tournaments/[tournamentId]/control-room` snapshot endpoint.
- Reduced dashboard refresh fan-out from four data requests to two.
- Added role-aware read-only control-room UI.
- Added explicit YouTube verification action with a 30-second per-station read cooldown.
- Reconciliation now safely auto-assigns queued unassigned matches to idle stations.

### 3. Match + bracket engine
- Bracket progression now materializes every ready downstream target in one transaction.
- Double-elimination winner and loser paths can both create/update their next matches.
- Match-specific station isolation remains enforced: a station can never run two LIVE matches concurrently.
- Reconciliation can assign newly-created queued matches to idle stations.

### 4. YouTube reliability/quota protection
- Added a separate station-level YouTube stream provisioning lock.
- Concurrent credential requests cannot create duplicate reusable YouTube streams.
- Existing broadcast/session locks remain in place.
- Normal viewers never call YouTube status APIs.
- Explicit operator verification is the only normal status read and is cooldown-limited.
- Write quota remains application-budgeted and blocks further writes after Google reports quota exhaustion.
- Broadcasts remain unlisted and station-scoped.

### 5. Analytics dashboard
- Added privacy-preserving anonymous viewer session hashes.
- Added daily unique-viewer approximation.
- Added watch hours and top-match audience metrics.
- Event reports now expose unique viewers, watch hours and top matches.
- Watch-page analytics now sends a stable session identifier from sessionStorage.

## Post-V8 production hardening
- Added explicit operator-triggered LiveKit egress reconciliation for LIVE stations missing playback.
- Added dedicated `clip:ready` realtime events instead of piggybacking on `match:updated`.
- Added rate limiting to score/status and station-assignment mutations.
- Added an active-incident panel with acknowledge/resolve controls in Control Room.
- Added a k6 public-event load-test smoke script and an npm high-severity audit CI gate.
- Added an incident-response runbook covering quota exhaustion, playback recovery, credential exposure, and Prisma P1001 incidents.

## V10 — Commercial Event Platform
- Added organization white-label fields and branding settings.
- Added public branded event route `/e/[slug]` and custom-domain host rewrite support.
- Added teams, rosters, tournament teams, player profiles and team profiles.
- Added sponsor management, public sponsor placements and click tracking.
- Added in-app organization/tournament notifications.
- Added authenticated tournament JSON export and participant import API.
- Added tournament analytics page.
- Added plan tiers and active-tournament limit enforcement.
- Added tournament format and best-of configuration, including round-robin scheduling.

## 2026-08-14 — Final repair pass after #1–#10 upgrades
- Added the missing `Tournament.sponsors` Prisma back-relation required by the `Sponsor.tournament` relation.
- Restored the missing `PLAN_LIMITS` import in the tournament creation API.
- Kept the existing commercial-event platform schema/migration changes intact.
- This repair is schema/client-generation focused: after extraction, run `npm install` and `npx prisma generate` before typecheck/build so Prisma Client is regenerated from the corrected schema.

## V28 — Persistent Stages & Generic Advancement (2026-08-18)
- Added persistent CompetitionStage model and Match.stageId.
- Added AdvancementSlot with MATCH_RESULT, STAGE_RANK and MANUAL sources.
- Added generic competition progression over MatchSide participants.
- Added stage-rank resolution through universal standings.
- Added stage management and advancement APIs.
- Wired tournament creation and bracket import to persistent stages.
- Fixed organization branding initialization so users without an existing personal organization are provisioned before settings render.
- Branding settings now surface clearer API errors and public tournament pages consume primary/accent brand values.
