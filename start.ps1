Write-Host "Starting Capstone Project..." -ForegroundColor Green
Write-Host ""

Set-Location backend-app

Write-Host "Running database setup..." -ForegroundColor Yellow
php setup.php

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Setup failed! Please check the errors above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Starting Laravel development server..." -ForegroundColor Green
Write-Host ""
php artisan serve

