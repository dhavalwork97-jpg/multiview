# One-click OBS bridge setup

Run `scripts/install-obs-bridge.cmd` once on the Windows OBS computer.

The installer saves the FGC Socket URL, bridge token, OBS WebSocket URL, and OBS password, installs dependencies, and creates a Windows scheduled task named `FGC OBS Bridge`.

The task starts automatically at Windows sign-in and restarts after failures. Dynamic tournament mode means new FGC tournaments require no bridge configuration or restart.

Use `scripts/obs-bridge-status.cmd` to inspect the task and `scripts/uninstall-obs-bridge.cmd` to remove automatic startup.
