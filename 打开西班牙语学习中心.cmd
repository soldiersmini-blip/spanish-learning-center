@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=F:\Installer_Packages (EN Path Req.)\Portfolio_Website_Dev_Environment\Software\NodeJS\node.exe"

if not exist "%NODE_EXE%" (
  for %%I in (node.exe) do set "NODE_EXE=%%~$PATH:I"
)

if not exist "%NODE_EXE%" (
  echo Node.js was not found.
  echo Please install Node.js or start the project from Codex.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Installing now...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

start "Spanish Learning Center - Local Server" cmd /k ""%NODE_EXE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173/"
