# V26 — Generic Match Engine

Built on top of the V11–V25 player-fix project.

Core architecture: `Match → Side A / Side B → Participants → Sport Rules → Scoring Adapter`

Included:
- Generic MatchSide and MatchParticipant models.
- Immutable MatchScoreEvent scoring ledger.
- Sport-rule presets and scoring adapter registry.
- Adapters for rounds, goals, points, runs, sets, games, battle royale and custom scoring.
- Generic team-vs-team match creation.
- Generic live score mutation through sideScores or scoreEvent.
- Existing playerOne/playerTwo compatibility fields retained as nullable projections.
- Migration backfill for existing matches.
- Unit and integration tests.

Verify in the real repository with:
`node scripts/apply-dynamic-competition-schema.mjs`
`npx prisma generate`
`npx prisma migrate deploy`
`npm run typecheck`
`npm run test`
`npm run build`

Next release: generic bracket progression, replacing playerOneId/playerTwoId bracket slots with side/participant identities.
