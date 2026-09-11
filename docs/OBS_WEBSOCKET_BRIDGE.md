# FGC → OBS WebSocket Bridge

The FGC web app runs in the cloud, while OBS normally runs on the operator's local production machine. The bridge therefore runs **locally beside OBS** and forwards FGC broadcast commands to OBS over OBS WebSocket.

## 1. Enable OBS WebSocket

OBS Studio 28+ includes obs-websocket 5.x.

In OBS:

1. Open **Tools → WebSocket Server Settings**.
2. Enable the WebSocket server.
3. Keep the default port `4455` unless you have a reason to change it.
4. Enable authentication and set a strong password.

## 2. Configure the bridge

From the FGC repository, create a local environment for the bridge:

```bash
export FGC_SOCKET_URL="https://<your-fgc-socket-host>"
export FGC_TOURNAMENT_ID="<tournament-id>"
export OBS_WEBSOCKET_URL="ws://127.0.0.1:4455"
export OBS_WEBSOCKET_PASSWORD="<obs-password>"
```

`FGC_TOURNAMENT_IDS` can be used instead of `FGC_TOURNAMENT_ID` for multiple tournaments, separated by commas.

## 3. Start the bridge

```bash
npm install
npm run obs:bridge
```

The bridge joins the configured tournament room on FGC's Socket.IO server. When an operator clicks a scene in the FGC Control Room, the server publishes `broadcast:updated`; the bridge reads the mapped `obsScene` and calls OBS `SetCurrentProgramScene`.

Example:

```text
FGC Control Room
  ↓
POST /api/broadcast/command
  ↓
FGC broadcast state + Socket.IO event
  ↓
Local obs-bridge.ts
  ↓
OBS WebSocket :4455
  ↓
OBS Program Scene changes
```

## 4. Scene mapping

Use the FGC **OBS Mapping** page to map FGC scenes to the exact OBS scene names, for example:

```text
STARTING SOON → FGC Starting Soon
INTRO         → Match Intro
VERSUS        → VS Screen
GAMEPLAY      → Main Game
TIMEOUT       → Timeout
REPLAY        → Replay
WINNER        → Winner
CHAMPION      → Champion
BRB           → BRB
```

The mapping is sent with each broadcast command, so the local bridge does not need to know the scene names ahead of time.

## Security

The OBS password stays on the local production machine. It is never sent to FGC or stored in the FGC database.
