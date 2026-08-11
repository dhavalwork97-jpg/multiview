# FGC Stream — Tournament Control Room

The sellable operator workflow is now centered on:

- one physical broadcast station per YouTube reusable stream
- one station card showing current match, YouTube lifecycle, heartbeat age and health
- quick match assignment and Start/End controls
- one-click OBS credentials per station
- automatic refresh through the existing Socket.IO tournament room plus a polling fallback
- station creation from the control room
- a queue of unassigned matches

Open:

`/admin/tournaments/<tournamentId>/control-room`

## Health model

The dashboard deliberately does **not** claim to read private OBS encoder bitrate or dropped-frame telemetry. The current app can reliably verify the YouTube ingest/broadcast lifecycle through the YouTube API. `healthStatus=bad` is surfaced as an attention/error state, and a missing server heartbeat for more than 60 seconds is marked stale.

This keeps the operator dashboard truthful while still giving an event producer a single screen for all stations.
