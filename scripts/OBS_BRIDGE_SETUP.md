# One-click FGC OBS Bridge

On Windows, run `scripts/install-obs-bridge.cmd` once.

The installer asks for:

- FGC Socket URL
- FGC OBS bridge token
- OBS WebSocket URL
- OBS WebSocket password

It then installs dependencies and creates a Windows scheduled task named `FGC OBS Bridge` that starts at user logon and restarts after failures.

After installation, the operator does not need to run npm commands again. The bridge uses dynamic tournament mode by default, so new FGC tournaments work automatically.

To reinstall or change credentials, run the installer again. Existing saved values can be kept where supported by the prompts.
