# v31.10 — OBS Integration

FGC Stream v31.10 adds a production OBS presentation bridge while keeping the game observer as the actual in-game camera operator.

## Architecture

```text
FGC Stream broadcast director
        |
        +-- scene / match / overlay state
        |
        v
   OBS WebSocket
        |
        +-- scenes
        +-- transitions
        +-- scoreboard text
        +-- lower thirds
        +-- stream / record controls

BGMI observer remains responsible for the spectator camera and POV.
```

## OBS setup

1. Use OBS Studio 28+ with WebSocket enabled.
2. In OBS: **Tools → WebSocket Server Settings**.
3. Enable the WebSocket server. The default local endpoint is `ws://127.0.0.1:4455`.
4. Set a WebSocket password and enter it only in the FGC control-room browser. The password is not persisted by FGC.
5. Create or map OBS scenes for `OFFLINE`, `WAITING`, `MATCH`, `BREAK`, `INTERMISSION`, and `RESULTS`.
6. Add text-capable OBS sources for the configured scoreboard, lower third, and optional overlay source names.
7. Open the FGC control room on the same PC that runs OBS when using the default localhost endpoint.

## Control-room workflow

1. Connect OBS in **Program output bridge**.
2. FGC reads the current program scene, OBS scenes, transitions, stream state, and recording state.
3. Map each FGC broadcast scene to the actual OBS scene name and save the mapping.
4. Selecting a broadcast scene automatically sends the mapped OBS program scene.
5. Applying a featured match or broadcast overlay automatically refreshes configured graphics sources after the broadcast state changes.
6. Use **Sync graphics** when a graphics source was changed or recreated in OBS.
7. Start/stop stream and recording from the control room when the operator has explicitly connected to OBS.

## Security and failure behavior

- OBS credentials are kept in browser memory only; the password is never sent to the FGC server.
- The bridge is browser-to-OBS, so a deployed FGC server does not need network access to the observer PC.
- OBS request calls have an 8-second timeout so the control room cannot hang indefinitely.
- Disconnects reject pending OBS requests and expose the disconnected state to the operator.
- Scene/source names are configurable; FGC does not assume that every production has the same OBS scene names.

## Important camera boundary

OBS presentation control does **not** control the BGMI spectator camera. The observer still chooses free camera or team POV and switches to fights. The Observer Assistant supplies recommendations and context; v31.10 adds the broadcast-output controls around that human camera workflow.
