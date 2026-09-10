# V34 — Dynamic Competition Engine

V34 makes tournament structure stage-driven instead of assuming one global tournament format.

## Model

`Tournament → Stages → Sessions/Matches → Scoring → Advancement → Victory condition`

Each stage owns its own format, session mode, scoring rules, advancement rule and victory condition.

## Battle Royale

Battle Royale competitions use `BATTLE_ROYALE_SESSION` stages. They intentionally do **not** expose Round Robin, Swiss or Best-of-X controls.

A BR event can therefore be configured as:

1. Qualifiers — fixed number of games, placement + eliminations, top N advance.
2. Semifinals — independent game count/scoring, top N advance.
3. Finals — threshold or Match Point victory condition, including a required win after reaching the threshold.

## Standard competitions

Existing Round Robin, Swiss, Single Elimination, Double Elimination and League formats remain available to standard competitions.

## Custom competitions

Custom competitions can combine stage types, including BR sessions and bracket stages, without requiring a new hard-coded tournament format for every game.

The schema is validated with Zod before a configuration is accepted, and existing tournament fields remain compatible with the current Prisma model.
