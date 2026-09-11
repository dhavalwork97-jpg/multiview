$taskName = "FGC OBS Bridge"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if (-not $task) {
  Write-Host "FGC OBS Bridge is not installed." -ForegroundColor Yellow
  exit 1
}

$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "FGC OBS Bridge" -ForegroundColor Cyan
Write-Host "State: $($task.State)"
Write-Host "Last run: $($info.LastRunTime)"
Write-Host "Last result: $($info.LastTaskResult)"
Write-Host "Next run: $($info.NextRunTime)"
Write-Host ""
Write-Host "Log: $env:APPDATA\FGC\obs-bridge.log" -ForegroundColor Gray
