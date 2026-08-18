# V27 — Universal Standings & Competition Operations

V27 extends the generic match engine into a format-neutral competition results layer.

## Added

- Universal standings calculated from completed `Side A / Side B` matches.
- Team, individual, doubles/pair and mixed participant identities.
- W/D/L, points, score-for, score-against, score-difference and win rate.
- Rules snapshots can supply `winPoints`, `drawPoints` and `lossPoints` (defaults 3/1/0).
- Organizer standings workspace at `/admin/tournaments/:id/standings`.
- Tournament admin navigation now exposes **Standings**.
- Read endpoint: `GET /api/tournaments/:id/standings`.

## Architecture direction

The platform is now deliberately split into:

`Competition -> Stage/Format -> Match -> Side -> Participants -> Rules -> Scoring Adapter -> Standings`

This keeps football, cricket, tennis, basketball, Valorant, BGMI and custom competitions on the same core model while allowing sport-specific scoring adapters.

## Next architectural step

The next major upgrade should be a persistent multi-stage competition model (qualification/group/Swiss/league/knockout/final) with generic advancement slots. That should replace the remaining player-only bracket topology instead of adding more sport-specific branches.
