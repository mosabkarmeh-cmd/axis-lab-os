param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$ExecutablePath = "$env:LOCALAPPDATA\Programs\AXIS LAB OS\AXIS LAB OS.exe",
  [int]$Port = 3210,
  [string]$DataDirectory = "$env:APPDATA\axis-lab-os-central",
  [string]$TaskName = "AXIS LAB OS Central Server"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $DataDirectory | Out-Null

if (Test-Path $ExecutablePath) {
  $command = $ExecutablePath
  $argument = "--central-server --port $Port --data-dir `"$DataDirectory`""
} else {
  $nodeCommand = Get-Command node.exe -ErrorAction Stop
  $nodePath = $nodeCommand.Source
  $scriptPath = Join-Path $ProjectRoot "scripts\start-central-server.cjs"
  if (-not (Test-Path $scriptPath)) { throw "Central server script not found: $scriptPath" }
  if (-not (Test-Path (Join-Path $ProjectRoot "dist\server.cjs"))) {
    throw "dist\server.cjs is missing. Run npm.cmd run build first."
  }
  $command = $nodePath
  $argument = "`"$scriptPath`" --host 0.0.0.0 --port $Port --data-dir `"$DataDirectory`""
}

$action = New-ScheduledTaskAction -Execute $command -Argument $argument -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "AXIS LAB OS central SQLite API server on the local network"

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Installed and started: $TaskName"
Write-Host "Executable: $command"
Write-Host "Data: $DataDirectory\axis-data.sqlite"
Write-Host "Health: http://127.0.0.1:$Port/api/health"
Write-Host "For clients use: http://<SERVER-IP>:$Port"
