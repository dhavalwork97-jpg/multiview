# FGC Stream v31.12 — Phase 1 Production Safety

This patch is based on the original v31.11 source tree. Existing API routes and Prisma migrations are preserved.

## Database safety

For an existing Neon/production database, use:

```bash
npx prisma migrate status
npx prisma generate
npm run typecheck
npm run build
```

To apply already-created pending migrations in a deployment environment, use:

```bash
npm run prisma:deploy
```

**Do not use `npx prisma migrate dev` against the production database.** `migrate dev` can request a schema reset when it detects migration drift.

## Phase 1 changes

- Added `prisma:deploy` for non-destructive production migration deployment.
- Added `prisma:status` convenience script.
- Preserved the existing Clerk middleware and authorization model.
- Preserved the existing `src/lib/auth.ts` compatibility exports and organization-aware RBAC.
- Preserved all existing tournament, stage, match, progression, broadcast, and webhook API implementations.
- No Prisma migration files were changed.
- No database reset is required.

## Recommended verification

```bash
npx prisma migrate status
npx prisma generate
npm run typecheck
npm run build
```
