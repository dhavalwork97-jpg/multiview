# V34 production hotfix

Broadcast commands now have a direct authenticated Socket.IO relay fallback when Redis is unavailable. Station assignments also expose Start Stream for assigned queued matches and Stop Stream/Preview for LIVE stations.

Required deployment configuration:

- Socket/Render: `FGC_OBS_BRIDGE_TOKEN`
- Next/Vercel: `FGC_SOCKET_INTERNAL_URL` and `FGC_SOCKET_INTERNAL_TOKEN`

Use the same secret for the Socket service and internal relay token. Scene selection remains manual from Control Room.