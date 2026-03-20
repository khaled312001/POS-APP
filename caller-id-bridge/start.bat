@echo off
title FRITZ!Card POS Bridge
cd /d "%~dp0"

echo.
echo  ================================================
echo   FRITZ!Card USB - POS Caller ID Bridge
echo  ================================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if node_modules missing
if not exist "node_modules" (
    echo [Setup] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo [Setup] Dependencies installed.
    echo.
)

:: Start bridge
echo [Start] Starting bridge... Press Ctrl+C to stop.
echo.
node capi-bridge.js

pause
