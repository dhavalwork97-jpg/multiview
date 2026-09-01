# V31.8 — Multi-Stage Tournament Engine

## Included

- Automatic group-stage generation from tournament entrants.
- Seed-aware snake distribution into 1, 2, or 4 groups.
- Round-robin fixtures inside each group.
- Configurable qualification count derived from group size.
- Dedicated Playoffs stage with knockout advancement.
- Dedicated Grand Final stage.
- Stage-rank advancement from completed group standings.
- Winner advancement from completed playoff matches.
- Automatic stage completion when every match in a stage is complete.
- Idempotent progression remains protected by AdvancementSlot resolution/claims.
- Battle Royale remains excluded from multi-stage bracket generation.
- No legacy Bracket row is created for the multi-stage engine; stages are the source of truth.

## Operational flow

1. Open Admin → Competition Rules.
2. Click **Generate stages** on a qualifying 4–64 entrant single-elimination tournament.
3. Complete every Group Stage match.
4. The group stage automatically becomes COMPLETED and qualified ranks populate Playoffs.
5. Complete Playoff matches; winners automatically populate the next playoff round.
6. The last playoff winner/finalists automatically populate Grand Final.
7. Complete Grand Final to finish the competition stage.

## Guardrails

- Minimum 4 entrants.
- v31.8 automation currently targets `SINGLE_ELIMINATION` tournaments as the playoff format.
- Existing stages or matches block generation to prevent duplicate competition graphs.
- Battle Royale/BGMI tournaments are rejected because they are standings/lobby driven.
