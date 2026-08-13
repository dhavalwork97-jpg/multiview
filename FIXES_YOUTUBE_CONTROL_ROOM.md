# FGC Stream — Control Room / YouTube fixes

## What changed

- Dashboard LIVE cards now embed the actual YouTube player instead of a blank placeholder.
- YouTube stream credentials are verified against the real YouTube Live Stream resource every time they are requested. If a saved stream was deleted/recreated in YouTube, the database is repaired and the current RTMP URL/key is returned.
- A station keeps one reusable RTMP stream key. Each match gets its own YouTube Live Broadcast/video.
- Starting a match is idempotent: retrying Start reuses the same broadcast instead of creating duplicate broadcasts.
- Broadcast creation is verified after binding. If binding fails, the newly-created YouTube broadcast is cleaned up so orphan broadcasts are not left behind.
- A previous non-live broadcast on the same station stream is cleaned up before a new match. A currently live broadcast is never silently killed.
- Ending a match explicitly ends/deletes its YouTube broadcast before marking the match completed.
- Match state is no longer demoted from LIVE back to QUEUED merely because YouTube is taking a few seconds to move READY/TESTING to LIVE.
- YouTube broadcast IDs/video IDs are stored on the Match model instead of relying only on the Station model.
- Organizer access is now checked against tournament ownership for control-room/station/match mutation routes.
- Stream credential UI explains that the station key itself does not create a YouTube broadcast; clicking Start on a match creates the broadcast.

## Deployment

Run the new Prisma migration against the production database before starting the new app version:

```bash
npx prisma migrate deploy
```

Then deploy/restart the web service.

## OBS behavior

The Server URL and Stream Key shown for a station are reusable station credentials. They do not change for every match. When an organizer starts a match, the backend creates a fresh YouTube Live Broadcast and binds it to that station's reusable stream. OBS should keep using the station's same RTMP credentials.
