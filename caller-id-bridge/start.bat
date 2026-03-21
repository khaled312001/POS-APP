@echo off
title FRITZ!Card POS Bridge
cd /d "%~dp0"

echo.
echo  ================================================
echo   FRITZ!Card USB - POS Caller ID Bridge
echo  ================================================
echo.
echo [Start] Starting bridge... Press Ctrl+C to stop.
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org
    pause
    exit /b 1
)

:: Check for CAPI DLL in common locations
set "CAPI_FOUND=0"
if exist "C:\Windows\System32\capi2032.dll"                          set "CAPI_FOUND=1"
if exist "C:\Windows\SysWOW64\capi2032.dll"                         set "CAPI_FOUND=1"
if exist "C:\Program Files\AVM\FRITZ!Card USB\capi2032.dll"         set "CAPI_FOUND=1"
if exist "C:\Program Files (x86)\AVM\FRITZ!Card USB\capi2032.dll"   set "CAPI_FOUND=1"
if exist "C:\Program Files\AVM\capi2032.dll"                        set "CAPI_FOUND=1"
if exist "C:\Program Files (x86)\AVM\capi2032.dll"                  set "CAPI_FOUND=1"
if exist "C:\AVM\capi2032.dll"                                      set "CAPI_FOUND=1"

if %CAPI_FOUND%==0 (
    echo  ================================================
    echo   [ERROR] capi2032.dll is NOT installed
    echo  ================================================
    echo.
    echo  DIAGNOSIS: Windows is using a generic Microsoft ISDN driver.
    echo  The AVM FRITZ!Card CAPI software layer is missing.
    echo.
    echo  HOW TO FIX:
    echo   1. Go to: https://avm.de/service/download/
    echo   2. Search: FRITZ!Card USB v2.1
    echo   3. Download the full driver package for Windows 10/11
    echo      (or Windows 7 package if no newer version available)
    echo   4. Right-click installer ^> Run as Administrator
    echo   5. Reboot the computer
    echo   6. Run this file again
    echo.
    echo  See install-drivers.md for detailed instructions.
    echo  ================================================
    pause
    exit /b 1
)

:: Install dependencies on first run
if not exist "node_modules" (
    echo [Setup] Installing dependencies...
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
set EXIT_CODE=%errorlevel%

:: If exit code is 1, driver/config issue — don't restart, show error
if %EXIT_CODE%==1 (
    echo.
    echo [ERROR] Bridge exited with an error. Not restarting.
    echo         Check the messages above and fix the issue first.
    pause
    exit /b 1
)

echo.
echo [%date% %time%] Bridge stopped (code=%EXIT_CODE%). Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto RESTART
