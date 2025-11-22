@echo off
REM Batch file to start both backend and frontend in development mode
REM This script will open two separate terminal windows for backend and frontend

echo Starting DeepRemember Development Environment...
echo.

REM Get the script directory (root folder)
set "SCRIPT_DIR=%~dp0"

REM Start Backend in a new window
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d "%SCRIPT_DIR%backend" && echo Backend Server Starting... && npm start"

REM Wait a moment before starting frontend
timeout /t 2 /nobreak >nul

REM Start Frontend in a new window
echo Starting Frontend Development Server...
start "Frontend Dev Server" cmd /k "cd /d "%SCRIPT_DIR%client" && echo Frontend Development Server Starting... && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:3000 (or your configured port)
echo Frontend: http://localhost:5173 (or Vite default port)
echo.
echo This window will close in 5 seconds...
timeout /t 5 /nobreak >nul

