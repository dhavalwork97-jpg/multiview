# YouTube Live setup for FGC Stream

This build replaces LiveKit media transport with YouTube Live while preserving the existing Tournament → Match → Station model.

## 1. Google Cloud

Create/select a Google Cloud project and enable **YouTube Data API v3**.
Create OAuth credentials for a **Web application**.
Add this Authorized redirect URI:

`https://YOUR-VERCEL-DOMAIN/api/youtube/callback`

For local testing also add:

`http://localhost:3000/api/youtube/callback`

Set these Vercel environment variables:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

Deploy once, sign in as an organizer/admin, then open:

`https://YOUR-VERCEL-DOMAIN/api/youtube/auth`

Approve YouTube access. The callback displays a refresh token. Put that value in Vercel as `YOUTUBE_REFRESH_TOKEN`, then redeploy.

## 2. Station setup

Open the tournament admin station board and click **Get streaming credentials** for each station.

The app creates one reusable YouTube Live Stream per station and returns the YouTube RTMP ingest URL + stream key.

Put those into OBS:

- Service: Custom
- Server: the returned YouTube RTMP URL
- Stream Key: the returned station key

Do not share stream keys.

## 3. Starting a match

Assign the match to a station as before. When the organizer changes the match status to LIVE, the backend creates a YouTube Live Broadcast and binds it to that station's reusable Live Stream.

OBS can then publish to the station's stream. The website polls YouTube status every 5 seconds and the socket heartbeat also reconciles station state every 20 seconds.

When YouTube reports the broadcast as `live`, the station/match becomes LIVE and the existing watch page shows the YouTube player.

When YouTube reports `complete`, the live match is marked COMPLETED.

## 4. Database migration

After deploying this code, run:

`npx prisma migrate dev --name add_youtube_streaming`

for local development, or create/deploy the equivalent production migration with `npx prisma migrate deploy`.

## 5. Important limitation

The existing LiveKit recording/clip pipeline is intentionally not deleted in this migration. It is no longer used for live playback, but LiveKit-specific Recording/Clip automation will need a separate YouTube/VOD migration if you want those features to continue without LiveKit.
