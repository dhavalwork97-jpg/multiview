# V31.7 — Tournament Format & Competition Engine

## Included

- Battle Royale is a first-class standings/lobby competition and never creates a `Bracket` record.
- BGMI normalizes to `battle_royale` scoring and `league` competition type at API level.
- Battle Royale lobbies support one participant per match side and placement/kills/bonus score events.
- Public and admin standings consume persisted score events for Battle Royale.
- Knockout formats are the only formats that create bracket records.
- Round robin and Swiss create fixture matches without brackets.
- Tournament viewer state exposes presentation mode and ordered competition stages.
- Admin live scoring supports multi-entrant Battle Royale lobbies.
- Broadcast control-room data identifies Battle Royale matches so the director does not present them as head-to-head matches.
- Tournament creation validation accepts 2–64 entrants for league/Swiss/BR and retains power-of-two validation for automatic knockout draws.
- Existing stage API remains available for adding/completing stages and resolving stage-rank advancement.

## Verification

The modified TypeScript/TSX files were syntax-transpiled successfully with the project's TypeScript compiler.

A full `tsc --noEmit` run could not complete because the uploaded environment's dependency installation timed out and left several `@types/*` packages incomplete. Run `npm ci`, `npm run prisma:generate`, then `npm run typecheck` in the normal development environment.
