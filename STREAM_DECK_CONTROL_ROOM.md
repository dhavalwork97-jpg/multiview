# FGC Control Room — Stream Deck Controls

FGC exposes a small, deterministic HTTP control surface for Stream Deck HTTP actions. It is intentionally limited to safe queued-match operations; it does not start/stop a live match or mutate competition scores.

## Required environment variable

Set `FGC_STREAM_DECK_TOKEN` in the Vercel/production environment to a long random secret. Keep it private.

## Endpoint

`POST /api/control-room/stream-deck`

Headers:

```text
Authorization: Bearer <FGC_STREAM_DECK_TOKEN>
Content-Type: application/json
```

### Button: Assign next

Assigns the oldest unassigned `QUEUED` match to the selected station.

```json
{
  "action": "ASSIGN_NEXT",
  "tournamentId": "<TOURNAMENT_ID>",
  "stationId": "<STATION_ID>"
}
```

Safeguards:
- station must belong to the tournament
- station must be healthy/online and not stale
- station cannot already contain a queued/live match
- only an unassigned queued match can be selected
- transaction re-checks both match and station before assignment
- action is written to the operator audit log
- realtime `match:updated` is published

### Button: Clear station

Removes the queued match from the selected station. It never clears a live or completed match.

```json
{
  "action": "CLEAR",
  "tournamentId": "<TOURNAMENT_ID>",
  "stationId": "<STATION_ID>"
}
```

The action is audited and publishes a realtime match update.

## Recommended Stream Deck layout

Create one pair of buttons per production station:

- `ST01 NEXT` → `ASSIGN_NEXT` with that station ID
- `ST01 CLEAR` → `CLEAR` with that station ID
- repeat for `ST02`, `ST03`, etc.

Use a Stream Deck HTTP Request plugin that supports custom method, headers, and JSON body. Point it at the production FGC URL.

These controls deliberately operate on the queue rather than browser selection state, so a disconnected operator browser cannot accidentally change which match a hardware button targets.
