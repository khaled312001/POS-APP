@echo off
title Install FRITZ!Card Bridge — Windows Service
cd /d "%~dp0"

echo.
echo  ================================================
echo   تثبيت البريدج كـ Windows Service دائم
echo   Install Bridge as permanent Windows Service
echo  ================================================
echo.

:: Must run as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] يجب تشغيل هذا الملف كـ Administrator
    echo [ERROR] Right-click → "Run as administrator"
    pause
    exit /b 1
)

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js غير مثبت / Node.js not installed.
    echo         Download: https://nodejs.org
    pause
    exit /b 1
)

:: Install npm dependencies (once)
if not exist "%~dp0node_modules" (
    echo [Setup] Installing npm packages...
    call npm install --prefix "%~dp0"
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: Install node-windows if not present
node -e "require('node-windows')" >nul 2>&1
if errorlevel 1 (
    echo [Setup] Installing node-windows...
    call npm install node-windows --save --prefix "%~dp0"
    if errorlevel 1 (
        echo [ERROR] Failed to install node-windows.
        pause
        exit /b 1
    )
)

:: Create logs directory
if not exist "%~dp0logs" mkdir "%~dp0logs"

:: Install the service
echo [Service] Installing Windows Service...
node "%~dp0install-service.js"

if errorlevel 1 (
    echo.
    echo [ERROR] Service installation failed.
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   [OK] تم التثبيت! / Service installed!
echo  ================================================
echo.
echo   - البريدج يعمل الآن كـ Windows Service
echo   - Bridge is running as a Windows Service
echo   - يبدأ تلقائياً مع Windows بدون الحاجة لتسجيل دخول
echo   - Auto-starts on Windows boot (no login needed)
echo   - يعيد التشغيل تلقائياً لو وقع
echo   - Auto-restarts on crash
echo.
echo   لإيقاف الخدمة نهائياً:
echo   To remove: run remove-windows-service.bat
echo.
pause
