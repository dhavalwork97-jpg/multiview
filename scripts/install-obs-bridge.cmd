@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-obs-bridge.ps1"
if errorlevel 1 (
  echo.
  echo FGC OBS Bridge setup failed. See the error above.
  pause
)
endlocal
