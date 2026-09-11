# FGC OBS Bridge install

Run `scripts/install-obs-bridge.cmd` once on the Windows OBS computer.

It saves connection settings, installs dependencies, and registers the `FGC OBS Bridge` scheduled task. The task starts at Windows sign-in and restarts after failures. Dynamic tournament mode means new tournaments require no bridge setup or restart.

Use `scripts/obs-bridge-status.cmd` to inspect status and `scripts/uninstall-obs-bridge.cmd` to remove automatic startup.
