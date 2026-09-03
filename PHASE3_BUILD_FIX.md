# Phase 3.1 Build Fix

Fixes reported on `feat/v31.13-phase3-streaming-hardening`:

- Supplies `hlsPlaylistKey` to the `MultiView` station type in `src/app/multiview/page.tsx`.
- Restores the production-build behavior where existing ESLint debt does not block `next build` via `eslint.ignoreDuringBuilds` in `next.config.ts`.
- No Prisma schema or migrations changed.
