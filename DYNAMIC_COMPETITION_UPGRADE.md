# Dynamic Competition Engine Upgrade

This build continues the current FGC Stream codebase and moves the product toward a generic competition platform.

## Included
- Generic competition preset/rule layer in `src/lib/competition-engine.ts`
- Sport presets for esports, football, basketball, cricket, tennis, badminton, volleyball, table tennis and custom competitions
- Dynamic tournament creation form with sport, participant model, scoring adapter and custom rules JSON
- Rules are snapshotted onto Tournament and Match records
- Existing MatchSide / MatchParticipant models are populated for newly-created matches
- Automatic single-elimination draws support non-power-of-two entry counts by using byes
- New public `/teams` and `/players` directories
- Navigation expanded to Teams and Players
- Responsive navigation made horizontally scrollable with high-contrast visible buttons
- Dashboard action controls consolidated into a responsive toolbar
- Tournament admin sub-navigation for Overview, Control Room, Operations, Ops, Analytics and Report
- Generic metadata and public tournament labels
- Player profile team lookup fixed to avoid invalid Prisma include typing

## Important
No Prisma schema migration is required for these changes because the current schema already contains:
`Tournament.sport`, `competitionType`, `participantMode`, `scoringMode`, `competitionRules`, `MatchSide`, `MatchParticipant`, `MatchScoreEvent`, `Match.engineVersion`, `Match.scoringAdapter`, and `Match.rulesSnapshot`.

## Verify locally
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
```

If your local Neon database is temporarily unreachable, `prisma migrate deploy` can fail with P1001; that is a database connectivity issue rather than a TypeScript/build issue.
