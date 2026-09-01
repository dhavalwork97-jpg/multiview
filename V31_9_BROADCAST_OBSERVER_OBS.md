# v31.9 Broadcast Director + Observer Assistant + OBS

This milestone is designed for the real BGMI observer model: one spectator client, one active game view, one observer. FGC Stream does not fabricate multiple BGMI video feeds. It persists observer context, identifies active combat from available match/score events, ranks POV recommendations, and lets the observer manually take the recommended team in the BGMI spectator client.

## OBS setup

1. Run OBS on the same observer PC.
2. Enable **WebSocket Server** in OBS (OBS 28+): Tools → WebSocket Server Settings.
3. Default local endpoint is `ws://127.0.0.1:4455`.
4. Set a password and enter it in the FGC Observer Assistant.
5. Create scenes named `MATCH` and `WAITING` (additional scenes can be added later).
6. The FGC panel can connect, read the current program scene, switch scenes, start/stop streaming, and start/stop recording.

The OBS connection is browser-local and optional; a disconnected OBS instance never blocks tournament state or match progression.

## Architecture

BGMI Spectator Client → Observer PC → FGC Observer Assistant → OBS → Stream

The observer remains responsible for the actual BGMI camera/POV switch. FGC Stream supplies the context, recommendations, and broadcast/graphics controls.
