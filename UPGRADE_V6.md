# FGC Stream V6 — Public Event Hub

## What changed
- Upgraded `/tournaments/:tournamentId` into a spectator-first event hub.
- Shows all currently LIVE matches with station labels and direct Watch links.
- Shows recent completed results and scores.
- Added route metadata for better browser/SEO previews.
- All public event data is DB-backed; no YouTube API polling is performed.
- Existing bracket explorer remains the authoritative competition navigation.

## Product benefit
The event URL can now be shared directly with spectators. They land on the event, immediately see which games are live, and can open the exact match they want. This preserves station isolation: a match links to its own `/watch/:matchId` page rather than a generic station stream.

## Quota safety
Refreshing or sharing the public event page does not call YouTube. YouTube remains an explicit provisioning/status concern on the operator side.
