@echo off
echo Starting Capstone Project...
echo.

cd /d "%~dp0backend-app"

if /I "%~1"=="-Setup" goto do_setup
if /I "%~1"=="/Setup" goto do_setup
if /I "%~1"=="setup" goto do_setup

echo Skipping DB setup (fast start). Use start.bat -Setup if needed.
echo.
goto serve

:do_setup
echo Running database setup (migrate + seed)...
php setup.php
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Setup failed! Please check the errors above.
    pause
    exit /b %ERRORLEVEL%
)
echo.

:serve
echo Starting Laravel development server...
echo.
php artisan serve
