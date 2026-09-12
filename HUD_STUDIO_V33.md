# FGC HUD Studio v1

FGC HUD Studio is a browser-source broadcast graphics layer. OBS does not own match data; FGC does. A tournament operator selects a package in HUD Studio and uses the generated overlay URL as an OBS Browser Source.

## Packages

V1 ships 19 package definitions across Universal, Fighting, FPS, MOBA and Mobile families. They share the same renderer contract so package switching never requires changing the OBS scene architecture.

## Recommended OBS workflow

**One-time OBS setup:**

1. Install OBS Studio with the standard WebSocket server enabled (OBS 28+ includes obs-websocket).
2. Run the FGC local OBS Bridge with `npm run obs:bridge` and configure `FGC_SOCKET_URL`, `FGC_OBS_BRIDGE_TOKEN`, `OBS_WEBSOCKET_URL`, `OBS_WEBSOCKET_PASSWORD`, and `FGC_WEB_URL`.
3. The bridge connects to OBS at `ws://127.0.0.1:4455` by default and listens for FGC broadcast events.

**Per tournament/package:**

1. Open `Broadcast → HUD Studio` for the tournament.
2. Select a package and click **Install package**.
3. FGC persists the selected package and emits a broadcast update.
4. The local bridge creates or refreshes the OBS Browser Source automatically and switches the active FGC scene when the broadcast event fires.
5. Keep the source managed by FGC; the operator does not need to paste a new URL after package changes.

If the bridge is not running, **Copy OBS Browser Source URL** remains available as a manual fallback.

## Live data

The HUD renderer reads `/api/hud/{tournamentId}` and refreshes every 1.5 seconds. It resolves the active broadcast match and exposes player gamertags, scores, status, station, game, tournament name and best-of format. The endpoint is intentionally limited to broadcast-safe fields and does not require operator authentication because OBS Browser Sources cannot perform Clerk login.

The renderer URL is:

`/broadcast/{tournamentId}/overlay/hud/{packageId}?station=main`

Use a real station id in the query when a tournament has multiple production stations.

## API

Package catalog:

`GET /api/hud/packages`

Public HUD state:

`GET /api/hud/{tournamentId}?station={stationId}`

Authenticated package install:

`POST /api/hud/install` with `{ tournamentId, packageId, stationId }`.

## V1 design contract

- Transparent 16:9 output.
- No app chrome or navigation.
- Live player/score/status presentation.
- Package-specific accent tokens.
- Browser-source delivery for OBS.
- Local OBS provisioning through the existing FGC WebSocket bridge.
- No copyrighted game artwork is bundled. Game packages are original visual treatments and may be extended with properly licensed assets later.

## Architecture

`Control Room → BroadcastState/AppEvent → FGC Socket → Local OBS Bridge → OBS Browser Source → HUD renderer → live match API`

This keeps the production operator in FGC while OBS remains the final compositor/output device.
