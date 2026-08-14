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
