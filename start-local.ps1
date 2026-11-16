# Start local stack: MySQL (XAMPP) → Laravel API → frontend static serve.
# Run from project root:  powershell -ExecutionPolicy Bypass -File .\start-local.ps1

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend-app'
$frontend = Join-Path $root 'front-end'
$mysqlStart = 'C:\xampp\mysql_start.bat'

function Test-Port([int]$Port) {
  $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $c
}

Write-Host ''
Write-Host '=== Capstone local start ===' -ForegroundColor Cyan

# 1) MySQL
if (Test-Port 3306) {
  Write-Host '[OK] MySQL already listening on 3306' -ForegroundColor Green
} else {
  Write-Host '[..] Starting XAMPP MySQL...' -ForegroundColor Yellow
  if (-not (Test-Path $mysqlStart)) {
    Write-Host '[FAIL] C:\xampp\mysql_start.bat not found. Start MySQL in XAMPP Control Panel first.' -ForegroundColor Red
    exit 1
  }
  Start-Process -FilePath $mysqlStart -WindowStyle Minimized
  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Port 3306) { $ready = $true; break }
  }
  if ($ready) {
    Write-Host '[OK] MySQL is up on 3306' -ForegroundColor Green
  } else {
    Write-Host '[FAIL] MySQL did not start. Open XAMPP Control Panel → Start MySQL.' -ForegroundColor Red
    exit 1
  }
}

# 2) Laravel API
if (Test-Port 8000) {
  Write-Host '[OK] API already listening on 8000' -ForegroundColor Green
} else {
  Write-Host '[..] Starting php artisan serve...' -ForegroundColor Yellow
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$backend'; php artisan serve"
  ) -WindowStyle Normal
  Start-Sleep -Seconds 2
  if (Test-Port 8000) {
    Write-Host '[OK] API on http://127.0.0.1:8000' -ForegroundColor Green
  } else {
    Write-Host '[WARN] API window opened; wait a few seconds if 8000 is not ready yet.' -ForegroundColor Yellow
  }
}

# 3) Queue worker (needed for SIS / grade Import — otherwise stuck on “waiting for the import worker”)
$queueScript = Join-Path $env:TEMP 'capstone-queue-worker.ps1'
@'
Set-Location 'BACKEND_PATH'
Write-Host 'Import queue worker — leave this window open.' -ForegroundColor Cyan
php artisan queue:work database --sleep=1 --tries=1 --timeout=3600 --memory=512
'@ -replace 'BACKEND_PATH', ($backend -replace "'", "''") | Set-Content -Path $queueScript -Encoding UTF8

$queueAlready = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine -match 'queue:work' -and $_.CommandLine -match 'artisan' }
if ($queueAlready) {
  Write-Host '[OK] Import queue worker already running' -ForegroundColor Green
} else {
  Write-Host '[..] Starting import queue worker...' -ForegroundColor Yellow
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-File',
    $queueScript
  ) -WindowStyle Normal
  Start-Sleep -Seconds 1
  Write-Host '[OK] Queue worker started (needed for Import / Export)' -ForegroundColor Green
}

# 4) Frontend
if (Test-Port 3000) {
  Write-Host '[OK] Frontend already listening on 3000' -ForegroundColor Green
} else {
  $buildIndex = Join-Path $frontend 'build\index.html'
  if (-not (Test-Path $buildIndex)) {
    Write-Host '[WARN] front-end\build missing — run npm run build in front-end first.' -ForegroundColor Yellow
  } else {
    Write-Host '[..] Starting frontend serve on 3000...' -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
      '-NoExit',
      '-Command',
      "Set-Location '$frontend'; npx serve -s build -l 3000"
    ) -WindowStyle Normal
    Start-Sleep -Seconds 2
    Write-Host '[OK] Frontend on http://localhost:3000' -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'Open http://localhost:3000 — keep API + MySQL + queue-worker windows running.' -ForegroundColor Cyan
Write-Host 'Tip: In XAMPP Control Panel, enable MySQL Autostart so it comes back after reboot.' -ForegroundColor DarkGray
Write-Host ''
