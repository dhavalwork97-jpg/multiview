# V34 production hotfix

- Broadcast events have an authenticated Socket.IO relay fallback when Redis is unavailable.
- OBS bridge explicitly confirms protected room authentication.
- Station assignments expose Start Stream for assigned queued matches.
- LIVE stations expose Stop Stream and Preview.
- Scene selection remains manual from Control Room; no automatic transitions were introduced.

Deployment variables:
- Socket/Render: `FGC_OBS_BRIDGE_TOKEN`
- Next/Vercel: `FGC_SOCKET_INTERNAL_URL`, `FGC_SOCKET_INTERNAL_TOKEN`
