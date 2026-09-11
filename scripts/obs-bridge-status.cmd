@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0obs-bridge-status.ps1"
pause
endlocal
