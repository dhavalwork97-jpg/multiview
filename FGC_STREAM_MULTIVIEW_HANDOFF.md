
## 30. Reliability hardening pass added in current working ZIP

The current working ZIP includes an additional reliability pass:

- `src/lib/youtube-quota.ts` — application-side daily YouTube write budget and quota lockout.
- `src/app/api/admin/youtube-quota/route.ts` — admin-only quota usage endpoint.
- `stations.youtubeProvisioningAt` — short-lived DB lease preventing concurrent duplicate broadcast creation.
- `prisma/migrations/20260814050000_harden_youtube_quota_and_provisioning/` — production migration.
- YouTube write operations are budgeted before API calls; quota-exhausted responses block further writes until the next UTC day.
- Station broadcast reuse remains the default for Match A → Match B on the same station.
- Different stations retain independent YouTube broadcast/video resources.
- Match pages remain match-scoped and only render their stored YouTube video while that match is LIVE.
- Redis realtime fan-out is fail-safe instead of making database mutations fail when Redis is unavailable.
- Production clip queue requires `REDIS_URL` when the queue is actually used.
- Upstash REST rate limiting no longer creates undefined-credential clients during local builds.

Required production migration:

```bash
npx prisma migrate deploy
```

Recommended production variable:

```env
YOUTUBE_DAILY_QUOTA_BUDGET=3000
```

Do not add YouTube background polling simply to determine viewer status. The platform intentionally keeps normal viewer status DB-driven to preserve quota.
