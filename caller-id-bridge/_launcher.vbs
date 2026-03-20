' FRITZ!Card POS Bridge — Silent Auto-Restart Launcher
' Runs capi-bridge.js silently (no black CMD window)
' Automatically restarts if Node.js crashes

Dim oShell, sDir, sCmd
Set oShell = CreateObject("WScript.Shell")

' Find the directory this VBS lives in
sDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

' Build the node command
sCmd = "cmd /c cd /d """ & sDir & """ && node capi-bridge.js"

' Loop forever: run bridge, wait 5s on crash, restart
Do
    oShell.Run sCmd, 0, True
    WScript.Sleep 5000
Loop
