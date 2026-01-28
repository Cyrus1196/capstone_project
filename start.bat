@echo off
echo Starting Capstone Project...
echo.

cd backend-app

echo Running database setup...
php setup.php

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Setup failed! Please check the errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Starting Laravel development server...
echo.
php artisan serve

