@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unregister-ScheduledTask -TaskName 'FGC OBS Bridge' -Confirm:$false -ErrorAction SilentlyContinue; Write-Host 'FGC OBS Bridge startup task removed.' -ForegroundColor Green; Read-Host 'Press Enter to close'"
endlocal
