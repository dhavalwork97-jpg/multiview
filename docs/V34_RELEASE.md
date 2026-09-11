# V34 production hotfix

Broadcast commands now have an authenticated direct Socket.IO relay fallback when Redis is unavailable. The OBS bridge confirms protected room authorization. Station assignments expose Start Stream for assigned queued matches and Stop Stream/Preview for LIVE stations.

Scene selection remains manual from the browser Control Room.

Configure the same internal secret on the Next/Vercel service and Socket/Render service.