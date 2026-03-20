@echo off
title Install — FRITZ!Card POS Bridge Auto-Start
cd /d "%~dp0"

echo.
echo  ================================================
echo   تثبيت التشغيل التلقائي عند بدء Windows
echo   Install: Auto-start on Windows boot
echo  ================================================
echo.

:: Must run as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] يجب تشغيل هذا الملف كـ Administrator
    echo [ERROR] Right-click this file ^> "Run as administrator"
    pause
    exit /b 1
)

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed.
    echo         Download from: https://nodejs.org
    pause
    exit /b 1
)

:: Install npm dependencies (once)
if not exist "node_modules" (
    echo [Setup] Installing npm packages ^(first time only^)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check internet connection.
        pause
        exit /b 1
    )
    echo [Setup] Packages installed OK.
    echo.
)

:: Register _launcher.vbs in Windows Task Scheduler
:: Runs silently at every logon with highest privileges
schtasks /create ^
    /tn "BarmaglyFritzBridge" ^
    /tr "wscript.exe \"%~dp0_launcher.vbs\"" ^
    /sc onlogon ^
    /rl highest ^
    /f

if errorlevel 1 (
    echo.
    echo [ERROR] Task Scheduler registration failed.
    echo         Make sure you ran as Administrator.
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   [OK] تم التثبيت بنجاح! / Installed successfully!
echo  ================================================
echo.
echo   - البريدج سيشتغل تلقائياً كل مرة Windows يبدأ
echo   - Bridge auto-starts every Windows boot (hidden)
echo   - يعيد التشغيل تلقائياً لو وقع (auto-restarts on crash)
echo.
echo   لإيقاف الخدمة: شغّل uninstall-autostart.bat
echo   To remove:     run uninstall-autostart.bat
echo.
echo   ابدأ البريدج الآن؟ Start bridge now? (Y/N)
set /p RUN_NOW=
if /i "%RUN_NOW%"=="Y" (
    start "" wscript.exe "%~dp0_launcher.vbs"
    echo [OK] Bridge is now running in the background.
    echo [OK] البريدج شغّال الآن في الخلفية.
)
echo.
pause
