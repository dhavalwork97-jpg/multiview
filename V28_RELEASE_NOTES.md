# V28 — Persistent Stages & Generic Advancement

V28 is the next architectural layer after the V26 generic match engine and V27 universal standings.

## Core model

`Competition → Stage → Match → Side → Participants`

Advancement is now explicit:

`Source Match / Stage Rank → Advancement Slot → Target Match Side`

## What changed

- Persistent `CompetitionStage` model for qualifier, group, Swiss, league, knockout, consolation, final and custom phases.
- `Match.stageId` links every match to a persistent competition stage.
- `AdvancementSlot` supports winner/loser movement between matches without relying on `playerOneId` / `playerTwoId`.
- Stage-rank advancement can feed a later stage from universal standings.
- Generic progression copies complete side participant rosters, so singles, pairs, teams and mixed/custom participants use the same path.
- Existing legacy bracket fields remain intact for backward compatibility.
- Existing brackets are backfilled into persistent knockout stages by migration.
- New stage and advancement APIs are available under `/api/tournaments/:tournamentId/stages`.

## Architectural direction

This makes qualification → group/Swiss → knockout → final a first-class data model rather than a bracket JSON convention. Sport-specific rules remain inside the scoring adapter layer.
