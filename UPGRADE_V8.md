# FGC Stream — Upgrade Batch #1–#5

This batch focuses on production reliability before adding further commercial features.

1. Production RBAC and organization isolation
2. Control Room 2.0
3. Match/bracket lifecycle
4. YouTube quota and session reliability
5. Spectator analytics

The design keeps the core invariant: **one physical station can stream one match, while different stations can simultaneously stream different matches.** YouTube broadcasts are unlisted and embedded into the match-specific website page.

## Deployment

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
```

New migrations:
- `20260814130000_add_viewer_sessions`
- `20260814131000_add_youtube_stream_lock`
