@echo off
title Uninstall — FRITZ!Card POS Bridge Auto-Start
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo Right-click → Run as administrator
    pause
    exit /b 1
)

schtasks /delete /tn "BarmaglyFritzBridge" /f >nul 2>&1
echo [OK] Auto-start removed. / تم إلغاء التشغيل التلقائي.
pause
