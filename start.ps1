param(
    [switch]$Setup
)

Write-Host "Starting Capstone Project..." -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot\backend-app

if ($Setup) {
    Write-Host "Running database setup (migrate + seed)..." -ForegroundColor Yellow
    php setup.php

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Setup failed! Please check the errors above." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit $LASTEXITCODE
    }
    Write-Host ""
} else {
    Write-Host "Skipping DB setup (fast start). Use .\start.ps1 -Setup if needed." -ForegroundColor DarkGray
    Write-Host ""
}

Write-Host "Starting Laravel development server..." -ForegroundColor Green
Write-Host ""
php artisan serve
