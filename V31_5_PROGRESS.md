# V31.5 Broadcast Rundown Operations — Progress

## Completed in this package

The rundown cue API now uses explicit director actions:

- `TAKE`: only pending cues can go live; records `startedAt`; automatically completes any other live cue and records its `completedAt`.
- `COMPLETE`: only the live cue can be completed; records `completedAt`.
- `SKIP`: only pending cues can be skipped; records `completedAt`.
- LIVE cues cannot be deleted directly.

Normal PATCH updates remain available for cue metadata such as title, duration, position and payload. Arbitrary status mutation has been removed from the API contract.

## Next

Integrate the rundown into `TournamentControlRoom` with cue list, ON AIR indicator, and TAKE / COMPLETE / SKIP controls.
