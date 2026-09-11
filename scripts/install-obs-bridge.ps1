$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$appData = Join-Path $env:APPDATA "FGC"
$logFile = Join-Path $appData "obs-bridge.log"
$taskName = "FGC OBS Bridge"

New-Item -ItemType Directory -Force -Path $appData | Out-Null

Write-Host ""
Write-Host "FGC OBS Bridge - one-time setup" -ForegroundColor Cyan
Write-Host "This setup is only required once on this Windows PC." -ForegroundColor Gray
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is not installed. Install Node.js 22+ and run this installer again."
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "npm.cmd was not found. Repair/reinstall Node.js and run this installer again."
}

$currentSocket = [Environment]::GetEnvironmentVariable("FGC_SOCKET_URL", "User")
$socketUrl = Read-Host "FGC Socket URL [$currentSocket]"
if ([string]::IsNullOrWhiteSpace($socketUrl)) { $socketUrl = $currentSocket }
if ([string]::IsNullOrWhiteSpace($socketUrl)) { throw "FGC Socket URL is required." }

$currentToken = [Environment]::GetEnvironmentVariable("FGC_OBS_BRIDGE_TOKEN", "User")
if ($currentToken) {
  $token = Read-Host "FGC bridge token (press Enter to keep saved token)"
  if ([string]::IsNullOrWhiteSpace($token)) { $token = $currentToken }
} else {
  $token = Read-Host "FGC bridge token"
}
if ([string]::IsNullOrWhiteSpace($token)) { throw "FGC bridge token is required." }

$currentObsUrl = [Environment]::GetEnvironmentVariable("OBS_WEBSOCKET_URL", "User")
$obsUrl = Read-Host "OBS WebSocket URL [$currentObsUrl]"
if ([string]::IsNullOrWhiteSpace($obsUrl)) { $obsUrl = if ($currentObsUrl) { $currentObsUrl } else { "ws://127.0.0.1:4455" } }

$obsPassword = Read-Host "OBS WebSocket password"
if ([string]::IsNullOrWhiteSpace($obsPassword)) {
  $savedObsPassword = [Environment]::GetEnvironmentVariable("OBS_WEBSOCKET_PASSWORD", "User")
  if ($savedObsPassword) { $obsPassword = $savedObsPassword }
}
if ([string]::IsNullOrWhiteSpace($obsPassword)) { throw "OBS WebSocket password is required." }

[Environment]::SetEnvironmentVariable("FGC_SOCKET_URL", $socketUrl, "User")
[Environment]::SetEnvironmentVariable("FGC_OBS_BRIDGE_TOKEN", $token, "User")
[Environment]::SetEnvironmentVariable("OBS_WEBSOCKET_URL", $obsUrl, "User")
[Environment]::SetEnvironmentVariable("OBS_WEBSOCKET_PASSWORD", $obsPassword, "User")
[Environment]::SetEnvironmentVariable("FGC_TOURNAMENT_ID", $null, "User")
[Environment]::SetEnvironmentVariable("FGC_TOURNAMENT_IDS", $null, "User")

Write-Host "Installing project dependencies..." -ForegroundColor Yellow
Push-Location $root
try {
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

$envBlock = "`"FGC_SOCKET_URL=$socketUrl`" `"FGC_OBS_BRIDGE_TOKEN=$token`" `"OBS_WEBSOCKET_URL=$obsUrl`" `"OBS_WEBSOCKET_PASSWORD=$obsPassword`""
$command = "Set-Location -LiteralPath '$root'; & npm.cmd run obs:bridge *>> '$logFile'"
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 20 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Starting FGC OBS Bridge now..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $taskName

Write-Host ""
Write-Host "FGC OBS Bridge is installed." -ForegroundColor Green
Write-Host "It will start automatically every time you sign in to Windows." -ForegroundColor Green
Write-Host "New tournaments require no bridge setup or restart." -ForegroundColor Green
Write-Host "Log: $logFile" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to close"
