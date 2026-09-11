# V34 production hotfix

## OBS scene switching

Broadcast commands are persisted first and published through Redis when available. If Redis is unavailable, `broadcast:updated` commands are relayed directly to the Socket.IO service using the authenticated `/internal/events` endpoint. This prevents a successful Control Room command from silently disappearing before it reaches the local OBS bridge.

Configure on the Next/Vercel service:

- `FGC_SOCKET_INTERNAL_URL` — Socket.IO service URL.
- `FGC_SOCKET_INTERNAL_TOKEN` — shared secret accepted by the Socket.IO service.

Configure on the Socket/Render service:

- `FGC_OBS_BRIDGE_TOKEN` — same shared secret used by the local bridge.

The local bridge now confirms that it was accepted into the protected `obs-bridge` room. If authentication is rejected, the terminal reports it explicitly.

## Station assignments

Assigned queued matches now expose **Start Stream**. This transitions the match to LIVE through the existing guarded match API, which creates/reuses the station's YouTube broadcast after the station reservation succeeds.

LIVE stations expose **Stop Stream** and **Preview**. Stop uses the existing station YouTube session endpoint and respects the rule that a station with an active LIVE match cannot be stopped prematurely.

Scene selection remains 100% manual from the browser Control Room. No automatic Program transitions were added.
