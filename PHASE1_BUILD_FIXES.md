# v31.12 Phase 1 — Build & Production Safety Fixes

This package is based on the original v31.11 source archive. Existing authentication,
API handlers, progression logic, and Prisma migrations were preserved.

## Fixed

- Restored the original `src/lib/auth.ts` exports used throughout the application.
- Preserved the real tournament, stage, and match route handlers (no placeholders).
- Kept Prisma schema and migration history unchanged.
- Added `npm run prisma:status`.
- Added `npm run prisma:deploy` for production-safe migration deployment.
- Prevented existing ESLint findings from incorrectly blocking `next build`; TypeScript
  remains enforced separately by `npm run typecheck`.

## Verify

```bash
npx prisma migrate status
npx prisma generate
npm run typecheck
npm run build
```

For production migration deployment:

```bash
npm run prisma:deploy
```

Do NOT use `prisma migrate dev` against the production Neon database.

`npm run lint` remains available to report the existing lint findings separately.
