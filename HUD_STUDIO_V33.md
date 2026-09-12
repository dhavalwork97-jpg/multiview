# FGC HUD Studio v1

FGC HUD Studio is a browser-source broadcast graphics layer. OBS does not own match data; FGC does. A tournament operator selects a package in HUD Studio and uses the generated overlay URL as an OBS Browser Source.

## Packages

V1 ships 19 package definitions across Universal, Fighting, FPS, MOBA and Mobile families. They share the same renderer contract so package switching never requires changing the OBS scene architecture.

## OBS setup

1. Open `Broadcast → HUD Studio` for the tournament.
2. Select a package and click **Install package**.
3. Click **Copy OBS Browser Source URL**.
4. In OBS, add a Browser Source at 1920×1080 with transparent background.
5. Keep the source URL stable for the tournament; FGC owns the live data and package rendering.

The V1 renderer is available at:

`/broadcast/{tournamentId}/overlay/hud/{packageId}?station=main`

The package catalog is available at:

`/api/hud/packages`

## V1 design contract

- Transparent 16:9 output.
- No app chrome or navigation.
- Live player/score/round/timer presentation.
- Package-specific accent tokens.
- Browser-source delivery for OBS.
- No copyrighted game artwork is bundled. Game packages are original visual treatments and may be extended with properly licensed assets later.

## Next increment

The next HUD Studio increment should connect the renderer to the existing tournament/control-room match state, add station-scoped tokens, and add OBS WebSocket scene provisioning so the operator can install a complete scene collection without manual URL entry.
