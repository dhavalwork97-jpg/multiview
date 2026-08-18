# Generic Match Engine — V26 Architecture

The V26 layer changes the abstraction from **player vs player** to:

`Match → Side A / Side B → Participants → Sport Rules → Scoring Adapter`

## What is now generic

- `MatchSide` represents the two competitive sides using stable keys `A` and `B`.
- `MatchParticipant` can reference either a `Player` or a `Team`.
- A side can contain one participant (Street Fighter, tennis singles) or many participants (football, cricket, Valorant, doubles tennis, BGMI squads).
- `MatchScoreEvent` is an immutable scoring ledger for rounds, goals, runs, sets, kills, points, etc.
- `scoringAdapter` selects sport mechanics without putting sport-specific branches inside `Match`.
- `rulesSnapshot` freezes the rules used by the match even if tournament defaults are later changed.
- Existing `playerOneId/playerTwoId` and scores are retained as nullable compatibility projections for the current UI/bracket stack.

## Built-in adapters

| Sport | Adapter | Typical metric |
|---|---|---|
| Street Fighter / fighting | `rounds` | rounds |
| Valorant | `rounds` | rounds |
| Football | `goals` | goals |
| Basketball | `points` | points |
| Cricket | `runs` | runs |
| Tennis | `sets` | sets |
| Badminton / table tennis | `games` | games |
| BGMI | `battle_royale` | kills / points |
| Custom | `custom` | configured |

Adapters are deliberately small. A sport can evolve its rules without changing the relational Match model.

## API shape

Legacy requests remain valid:

```json
{
  "tournamentId": "...",
  "playerOneId": "...",
  "playerTwoId": "..."
}
```

New generic requests use:

```json
{
  "tournamentId": "...",
  "sport": "football",
  "scoringAdapter": "goals",
  "sides": [
    { "key": "A", "label": "Team Alpha", "participants": [{ "teamId": "..." }] },
    { "key": "B", "label": "Team Beta", "participants": [{ "teamId": "..." }] }
  ]
}
```

Live scoring can use `sideScores`, or append a `scoreEvent` such as:

```json
{
  "scoreEvent": { "sideKey": "A", "metric": "goals", "value": 1, "period": "2H" }
}
```

For BGMI, the same ledger can record kills/points and the adapter calculates the weighted aggregate. No BGMI-specific field is added to `Match`.

## Compatibility rule

Do **not** delete the legacy player columns yet. Existing brackets, control-room components and public cards still consume them. They are now nullable compatibility fields and are populated automatically when an old player-vs-player request is used.

The next architectural layer after V26 is **generic bracket progression**: bracket slots should point to Side/Participant identities rather than `playerOneId/playerTwoId`. That should be done after this engine has been exercised against real football/Valorant/team data, so bracket migration does not mix scoring and topology changes in one release.
