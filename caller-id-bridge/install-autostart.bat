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
    echo [ERROR] Right-click this file → "Run as administrator"
    pause
    exit /b 1
)

:: Install Node.js dependencies
if not exist "node_modules" (
    echo [Setup] Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: Create a silent VBScript launcher (runs Node.js with NO console window)
set BRIDGE_DIR=%~dp0
set VBS_FILE=%BRIDGE_DIR%_launch-silent.vbs

echo Set oShell = CreateObject("WScript.Shell")                        > "%VBS_FILE%"
echo Dim sCmd                                                          >> "%VBS_FILE%"
echo sCmd = "cmd /c cd /d ""%BRIDGE_DIR%"" ^& :loop ^& node capi-bridge.js ^& timeout /t 5 /nobreak ^& goto :loop" >> "%VBS_FILE%"
echo oShell.Run sCmd, 0, False                                         >> "%VBS_FILE%"

:: Simpler and more reliable loop script
echo Set oShell = CreateObject("WScript.Shell")  > "%VBS_FILE%"
echo Do                                          >> "%VBS_FILE%"
echo   oShell.Run "node """ & "%BRIDGE_DIR%capi-bridge.js""", 0, True  >> "%VBS_FILE%"
echo   WScript.Sleep 5000                        >> "%VBS_FILE%"
echo Loop                                        >> "%VBS_FILE%"

:: Register Task Scheduler — runs at Windows logon, with highest privileges
schtasks /create ^
  /tn "BarmaglyFritzBridge" ^
  /tr "wscript.exe \"%VBS_FILE%\"" ^
  /sc onlogon ^
  /rl highest ^
  /f >nul

if errorlevel 1 (
    echo [ERROR] فشل التثبيت — تأكد من تشغيل الملف كـ Administrator
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   [OK] تم التثبيت بنجاح!
echo  ================================================
echo.
echo   البريدج سيبدأ تلقائياً في كل مرة تشغيل Windows
echo   The bridge will auto-start every time Windows boots.
echo.
echo   Task name: BarmaglyFritzBridge
echo   To remove: run uninstall-autostart.bat
echo.
echo   ابدأ البريدج الآن؟ Start bridge now? (Y/N)
set /p CHOICE=
if /i "%CHOICE%"=="Y" (
    start "" wscript.exe "%VBS_FILE%"
    echo [OK] Bridge started in background.
)
echo.
pause
