@echo off
title FRITZ!Card POS Bridge — Auto Restart
cd /d "%~dp0"

echo.
echo  ================================================
echo   FRITZ!Card USB — POS Caller ID Bridge v1.0
echo   Auto-restart: ON (restarts if it crashes)
echo  ================================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js غير مثبت — حمّله من https://nodejs.org
    echo [ERROR] Node.js not found. Download from https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies on first run
if not exist "node_modules" (
    echo [Setup] Installing dependencies for first time...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check internet connection.
        pause
        exit /b 1
    )
    echo [Setup] Done.
    echo.
)

:RESTART
echo [%date% %time%] Starting bridge...
node capi-bridge.js
echo.
echo [%date% %time%] Bridge stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto RESTART
