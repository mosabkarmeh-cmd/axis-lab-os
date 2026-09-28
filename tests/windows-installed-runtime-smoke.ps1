$ErrorActionPreference = 'Stop'
$installer = Get-ChildItem -Path (Join-Path $env:GITHUB_WORKSPACE 'dist') -Filter '*Setup*.exe' | Select-Object -First 1
if (-not $installer) { throw 'Current-user installer not found.' }
$installDir = Join-Path $env:RUNNER_TEMP 'AxisLabInstalled'
if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Start-Process -FilePath $installer.FullName -ArgumentList @('/S', "/D=$installDir") -Wait
$exe = Join-Path $installDir 'AXIS LAB OS.exe'
if (-not (Test-Path $exe)) {
  $exe = Get-ChildItem -Path $installDir -Filter '*.exe' -Recurse | Where-Object { $_.Name -notmatch 'uninstall' } | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $exe -or -not (Test-Path $exe)) { throw "Installed AXIS LAB OS executable not found under $installDir" }
$proc = Start-Process -FilePath $exe -ArgumentList @('--central-server','--port','33321') -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:33321/api/health' -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { $ready = $true; break }
    } catch {}
  }
  if (-not $ready) { throw 'Installed EXE did not expose /api/health within 30 seconds.' }
  Write-Host 'windows-installed-runtime-smoke: PASS'
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Get-Process | Where-Object { $_.Path -and $_.Path -like "$installDir*" } | Stop-Process -Force -ErrorAction SilentlyContinue
}