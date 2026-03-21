@echo off
title Remove FRITZ!Card Bridge — Windows Service
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo Right-click → "Run as administrator"
    pause
    exit /b 1
)

echo [Service] Removing Windows Service...
node install-service.js remove

echo [OK] Service removed.
pause
