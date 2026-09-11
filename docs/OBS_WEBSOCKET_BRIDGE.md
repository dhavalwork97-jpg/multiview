# FGC → OBS WebSocket Bridge

The FGC web app runs in the cloud, while OBS normally runs on the operator's local production machine. The bridge therefore runs **locally beside OBS** and forwards FGC broadcast commands to OBS over OBS WebSocket.

## One-time Windows setup

For a Windows production PC, use the included installer:

1. Open the FGC repository folder.
2. Double-click `scripts/install-obs-bridge.cmd`.
3. Enter the FGC Socket URL, bridge token, OBS WebSocket URL, and OBS WebSocket password when prompted.
4. The installer installs dependencies and registers **FGC OBS Bridge** as a Windows logon task.

After this one-time setup:

- The bridge starts automatically whenever the operator signs in to Windows.
- It reconnects automatically if FGC or OBS temporarily disconnects.
- New tournaments are discovered automatically in dynamic mode.
- You do not enter a tournament ID or restart the bridge for each tournament.

The installer stores the connection settings as Windows user environment variables. Do not commit those values to Git or share them publicly.

## 1. Enable OBS WebSocket

OBS Studio 28+ includes obs-websocket 5.x.

In OBS:

1. Open **Tools → WebSocket Server Settings**.
2. Enable the WebSocket server.
3. Keep the default port `4455` unless you have a reason to change it.
4. Enable authentication and set a strong password.

## 2. Configure the bridge manually

If you are not using the Windows installer, the bridge can operate in **dynamic tournament mode**, so you do not need to enter a tournament ID every time a new tournament is created.

Set:

```powershell
$env:FGC_SOCKET_URL="https://<your-fgc-socket-host>"
$env:FGC_OBS_BRIDGE_TOKEN="<shared-bridge-token>"
$env:OBS_WEBSOCKET_URL="ws://127.0.0.1:4455"
$env:OBS_WEBSOCKET_PASSWORD="<obs-password>"
```

Leave `FGC_TOURNAMENT_ID` and `FGC_TOURNAMENT_IDS` unset for dynamic mode.

For a temporary filtered setup, either variable can still be supplied:

```powershell
$env:FGC_TOURNAMENT_IDS="tournament-a,tournament-b"
```

The socket server must have the same `FGC_OBS_BRIDGE_TOKEN` configured. The token authorizes the local bridge to join the protected `obs-bridge` event room.

## 3. Start the bridge manually

```powershell
npm.cmd install
npm.cmd run obs:bridge
```

In dynamic mode, the bridge joins the protected OBS bridge room once and receives broadcast events for newly created tournaments automatically. You do **not** restart it or change environment variables when creating another tournament.

When an operator clicks a scene in the FGC Control Room, the server publishes `broadcast:updated`; the bridge reads the tournament's mapped `obsScene` and calls OBS `SetCurrentProgramScene`.

```text
FGC Control Room
  ↓
POST /api/broadcast/command
  ↓
FGC broadcast state + Socket.IO event
  ↓
Protected OBS bridge room
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

The bridge room is protected by `FGC_OBS_BRIDGE_TOKEN`. Use a long random value and configure the same value on the FGC Socket service and the OBS computer. Do not commit the token to Git.
