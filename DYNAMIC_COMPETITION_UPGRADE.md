# Dynamic Competition Engine — Upgrade

This is an additive foundation for making FGC-Stream competition-agnostic.

## What it adds
- Sport/event is no longer conceptually tied to fighting games.
- Competition presets for fighting, football, basketball, cricket, tennis, badminton, table tennis, volleyball, other esports, and custom events.
- Participant model: individual, team, pair/doubles, mixed.
- Scoring mode: configurable instead of assuming rounds.
- Format and best-of are stored as competition rules.
- Public tournament pages can display the selected sport and participant model.

## Important
The latest complete project archive available in this chat predates some of the later #11–#25 work. Therefore this package is an **overlay**, not a replacement for the current repository. Do not replace your whole project with an older archive.

## Apply
1. Copy `src/lib/competition-engine.ts` and `src/components/admin/DynamicCompetitionFields.tsx` into the same paths in the current repo.
2. Copy `src/app/api/tournaments/dynamic-validation.ts` into the same path.
3. Copy the migration directory into `prisma/migrations/`.
4. Copy `scripts/apply-dynamic-competition-schema.mjs` into `scripts/`.
5. Run:

```bash
node scripts/apply-dynamic-competition-schema.mjs
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
```

6. The existing tournament creation route and form must then pass the new fields shown in `dynamic-validation.ts`. The package intentionally does not overwrite your current upgraded `route.ts` or `CreateTournamentForm.tsx`, because those files contain later commercial-platform changes that must be preserved.

## Architecture direction
This is the first layer. The next layer should move Match from hard-coded `playerOne/playerTwo` toward generic `sideA/sideB` participants, with sport-specific scoring adapters. That is what will make football teams, doubles, cricket teams, FPS teams, fighting-game players, and custom competitions truly share one engine rather than merely sharing a form.
