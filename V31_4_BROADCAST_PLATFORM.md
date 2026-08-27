# V31.4 — Broadcast Platform Foundation

FGC Stream's broadcast layer is now evolving from a tournament overlay controller into a production-oriented platform. The first V31.4 increment introduces a persistent **broadcast rundown**: ordered cues for matches, breaks, sponsor segments, lower thirds, videos, results and custom production events.

## Architecture
- **BroadcastState** remains the live director state and source of truth for what is currently on air.
- **BroadcastCue** is the planned show/rundown layer.
- Future OBS/vMix/ATEM agents should consume commands and state rather than becoming the system of record.
- Cue payloads are intentionally generic JSON so integrations can attach media IDs, lower-third data, scene hints, or external automation metadata without making the tournament schema broadcast-vendor-specific.

## Next increments
1. Control-room rundown editor with go-live/complete/skip actions.
2. Multi-output destinations and independent program feeds.
3. Pluggable automation agents for OBS, vMix and hardware switchers.
4. Talent, sponsor and graphics asset libraries.
5. Production audit/replay and cue timing analytics.
