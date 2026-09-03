# Phase 4 / v31.14 — Navigation + Visual Design System

## Implemented

- Upgraded the global navigation shell with clearer hierarchy, stronger active states, improved focus states, and responsive horizontal navigation.
- Standardized reusable visual primitives for page shells, headers, surfaces, actions, statuses, game tabs, and empty states.
- Redesigned the public tournaments page around game-first discovery.
- Added URL-addressable game tabs using `/tournaments?game=<game>`.
- Game tabs are generated from the public tournament data, so new games appear automatically.
- Added live-first grouping and a clear empty state when a selected game has no tournaments.
- Preserved public tournament discovery and existing tournament detail routes.

## Validation

Run from the repository root:

```bash
npm run typecheck
npm run build
```

Then manually smoke-test:

- `/`
- `/tournaments`
- `/tournaments?game=<game>` for each visible game tab
- `/teams`
- `/players`
- `/multiview`
- `/dashboard` when signed in
- `/admin` for organizer/admin users
- Mobile-width navigation and tournament tabs

## Scope

This phase intentionally builds on the existing `arena-*`, `ink-*`, and `signal-*` design tokens rather than introducing a second visual language or requiring a schema migration.
